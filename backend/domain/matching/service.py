from __future__ import annotations

from typing import Any

from core.contracts.matching import (
    MatchBookingContextContract,
    MatchBookingFitContract,
    MatchCandidateContract,
    MatchConfidenceContract,
    MatchQueryContextContract,
    MatchQueryUnderstandingContract,
    MatchRecommendationContract,
    MatchRequestContract,
    MatchResultContract,
    MatchSearchDiagnosticsContract,
    MatchSearchDiagnosticsDropContract,
    MatchSearchDiagnosticsStageContract,
    MatchSemanticAssistContract,
)


class MatchingService:
    """Foundation seam for request normalization, candidate retrieval, and ranking."""

    def build_empty_result(self, request: MatchRequestContract) -> MatchResultContract:
        return MatchResultContract(
            request=request,
            candidates=[],
            confidence=MatchConfidenceContract(score=0.0, reason="no_candidates"),
        )

    def build_booking_fit(
        self,
        *,
        candidate: dict[str, Any],
        booking_context: MatchBookingContextContract | None = None,
    ) -> MatchBookingFitContract | None:
        if not candidate:
            return None

        booking_context = booking_context or MatchBookingContextContract()
        budget_fit = "unknown"
        if candidate.get("price_posture") == "Within stated budget":
            budget_fit = "within_budget"
        elif candidate.get("price_posture") == "Above stated budget":
            budget_fit = "over_budget"

        party_size_fit = "unknown"
        party_size = booking_context.party_size
        category_text = " ".join(
            str(candidate.get(key) or "")
            for key in ("category", "service_name", "summary", "display_summary")
        ).lower()
        supports_group_booking = any(
            marker in category_text
            for marker in ("private dining", "group", "event", "venue", "table", "restaurant", "party")
        )
        if isinstance(party_size, int) and party_size > 0:
            if party_size <= 6 or supports_group_booking:
                party_size_fit = "supported"
            else:
                party_size_fit = "manual_review"

        availability_state = str(candidate.get("availability_state") or "").strip().lower()
        booking_path_type = str(candidate.get("booking_path_type") or "").strip().lower()
        schedule_fit = "unknown"
        if booking_context.requested_date or booking_context.requested_time or booking_context.schedule_hint:
            if booking_path_type in {"book_on_partner_site", "instant_book"}:
                schedule_fit = "booking_ready"
            elif availability_state in {"needs_manual_confirmation", "availability_unknown", "availability_unverified"}:
                schedule_fit = "manual_confirmation"

        location_fit = "unknown"
        trust_signal = str(candidate.get("trust_signal") or "").strip().lower()
        explanation = " ".join(
            str(candidate.get(key) or "")
            for key in ("why_this_matches", "explanation", "display_summary")
        ).lower()
        if "location" in explanation and "does not align" in explanation:
            location_fit = "mismatch"
        elif "online" in explanation or trust_signal == "online_location_flexible":
            location_fit = "online_flexible"
        elif candidate.get("location"):
            location_fit = "aligned"

        booking_readiness = "advisory"
        if booking_path_type == "instant_book":
            booking_readiness = "instant_book"
        elif booking_path_type == "book_on_partner_site":
            booking_readiness = "partner_redirect"
        elif booking_path_type == "request_callback" or party_size_fit == "manual_review":
            booking_readiness = "manual_review"

        summary_parts: list[str] = []
        if budget_fit == "within_budget":
            summary_parts.append("budget aligned")
        elif budget_fit == "over_budget":
            summary_parts.append("budget may exceed request")
        if party_size_fit == "supported":
            summary_parts.append("party size looks supported")
        elif party_size_fit == "manual_review":
            summary_parts.append("party size should be confirmed manually")
        if schedule_fit == "booking_ready":
            summary_parts.append("timing can move into booking flow")
        elif schedule_fit == "manual_confirmation":
            summary_parts.append("timing still needs provider confirmation")
        if location_fit == "aligned":
            summary_parts.append("location matches request")
        elif location_fit == "online_flexible":
            summary_parts.append("online delivery keeps location flexible")
        elif location_fit == "mismatch":
            summary_parts.append("location fit looks weak")

        return MatchBookingFitContract(
            budget_fit=budget_fit,
            party_size_fit=party_size_fit,
            schedule_fit=schedule_fit,
            location_fit=location_fit,
            booking_readiness=booking_readiness,
            summary=", ".join(summary_parts) or None,
        )

    def build_result(
        self,
        *,
        request: MatchRequestContract,
        request_id: str,
        candidates: list[dict[str, Any]],
        recommendations: list[dict[str, Any]],
        confidence: dict[str, Any],
        warnings: list[str],
        search_strategy: str | None,
        query_context: dict[str, Any] | None,
        booking_context: dict[str, Any] | None,
        query_understanding: dict[str, Any] | None,
        semantic_assist: dict[str, Any] | None,
        search_diagnostics: dict[str, Any] | None,
    ) -> MatchResultContract:
        booking_context_contract = MatchBookingContextContract.model_validate(booking_context or {})
        candidate_contracts = [
            MatchCandidateContract.model_validate(
                {
                    **candidate,
                    "booking_fit": self.build_booking_fit(
                        candidate=candidate,
                        booking_context=booking_context_contract,
                    ),
                }
            )
            for candidate in candidates
        ]
        recommendation_contracts = [
            MatchRecommendationContract.model_validate(
                {
                    **recommendation,
                    "booking_fit": self.build_booking_fit(
                        candidate=next(
                            (
                                candidate
                                for candidate in candidates
                                if str(candidate.get("candidate_id") or "")
                                == str(recommendation.get("candidate_id") or "")
                            ),
                            {},
                        ),
                        booking_context=booking_context_contract,
                    ),
                }
            )
            for recommendation in recommendations
        ]
        diagnostics_payload = dict(search_diagnostics or {})
        dropped_candidates = [
            MatchSearchDiagnosticsDropContract.model_validate(item)
            for item in diagnostics_payload.get("dropped_candidates", [])
        ]
        diagnostics_payload["dropped_candidates"] = dropped_candidates
        diagnostics_payload["stage_counts"] = [
            MatchSearchDiagnosticsStageContract(
                stage="retrieval",
                candidate_count=int(diagnostics_payload.get("retrieval_candidate_count") or 0),
            ),
            MatchSearchDiagnosticsStageContract(
                stage="heuristic_rank",
                candidate_count=len(diagnostics_payload.get("heuristic_candidate_ids", []) or []),
            ),
            MatchSearchDiagnosticsStageContract(
                stage="semantic_rank",
                candidate_count=len(diagnostics_payload.get("semantic_candidate_ids", []) or []),
            ),
            MatchSearchDiagnosticsStageContract(
                stage="relevance_gate",
                candidate_count=len(diagnostics_payload.get("post_relevance_candidate_ids", []) or []),
            ),
            MatchSearchDiagnosticsStageContract(
                stage="domain_gate",
                candidate_count=len(diagnostics_payload.get("post_domain_candidate_ids", []) or []),
            ),
            MatchSearchDiagnosticsStageContract(
                stage="final_shortlist",
                candidate_count=len(diagnostics_payload.get("final_candidate_ids", []) or []),
            ),
        ]
        return MatchResultContract(
            request=request,
            request_id=request_id,
            candidates=candidate_contracts,
            recommendations=recommendation_contracts,
            confidence=MatchConfidenceContract.model_validate(confidence),
            selected_candidate_id=(
                recommendation_contracts[0].candidate_id
                if recommendation_contracts
                else (candidate_contracts[0].candidate_id if candidate_contracts else None)
            ),
            next_action=(
                recommendation_contracts[0].next_step
                if recommendation_contracts
                else (candidate_contracts[0].next_step if candidate_contracts else None)
            ),
            search_strategy=search_strategy,
            warnings=warnings,
            query_context=MatchQueryContextContract.model_validate(query_context or {}),
            booking_context=booking_context_contract,
            query_understanding=MatchQueryUnderstandingContract.model_validate(query_understanding or {}),
            semantic_assist=MatchSemanticAssistContract.model_validate(semantic_assist or {}),
            search_diagnostics=MatchSearchDiagnosticsContract.model_validate(diagnostics_payload),
        )
