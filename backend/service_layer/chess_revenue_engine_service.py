from __future__ import annotations

from dataclasses import dataclass
from typing import Any


ASSESSMENT_TEMPLATE_VERSION = "grandmaster-chess-v1"
PROGRAM_CODE = "grandmaster_chess_academy"

ASSESSMENT_QUESTIONS: tuple[dict[str, Any], ...] = (
    {
        "question_id": "experience",
        "step": "experience",
        "prompt": "How long has the student been playing chess?",
        "choices": (
            {"answer_id": "beginner", "label": "Beginner", "score": 0},
            {"answer_id": "months_1_6", "label": "1-6 months", "score": 2},
            {"answer_id": "months_6_24", "label": "6-24 months", "score": 4},
            {"answer_id": "years_2_plus", "label": "2+ years", "score": 6},
        ),
    },
    {
        "question_id": "basic_knowledge",
        "step": "skill_check",
        "prompt": "Which statement best matches the student's current fundamentals?",
        "choices": (
            {"answer_id": "learning_moves", "label": "Still learning the moves", "score": 0},
            {"answer_id": "knows_rules", "label": "Knows pieces, checks, and simple mates", "score": 1},
            {"answer_id": "solid_fundamentals", "label": "Comfortable with tactics and planning", "score": 2},
        ),
    },
    {
        "question_id": "puzzle_skill",
        "step": "skill_check",
        "prompt": "How strong is the student on mate-in-1 or mate-in-2 puzzles?",
        "choices": (
            {"answer_id": "not_yet", "label": "Not yet", "score": 0},
            {"answer_id": "mate_in_1", "label": "Usually solves mate in 1", "score": 1},
            {"answer_id": "mate_in_2", "label": "Can solve mate in 2", "score": 2},
            {"answer_id": "advanced_tactics", "label": "Comfortable with deeper tactics", "score": 3},
        ),
    },
    {
        "question_id": "competitive_readiness",
        "step": "skill_check",
        "prompt": "What kind of game environment fits best right now?",
        "choices": (
            {"answer_id": "needs_guidance", "label": "Needs guided learning", "score": 0},
            {"answer_id": "regular_practice", "label": "Ready for regular practice games", "score": 1},
            {"answer_id": "competitive_play", "label": "Ready for tournament-style play", "score": 2},
        ),
    },
)

LEVEL_BANDS: tuple[dict[str, Any], ...] = (
    {"level": "beginner", "min_score": 0, "max_score": 2, "label": "Beginner"},
    {"level": "intermediate", "min_score": 3, "max_score": 5, "label": "Intermediate"},
    {"level": "advanced", "min_score": 6, "max_score": 8, "label": "Advanced"},
    {"level": "tournament", "min_score": 9, "max_score": 99, "label": "Tournament"},
)

CLASS_TEMPLATE: tuple[dict[str, Any], ...] = (
    {
        "class_code": "kids_mon_1600",
        "class_name": "Kids",
        "day_of_week": "Monday",
        "time_local": "4:00 PM",
        "duration_minutes": 60,
        "level_targets": ("beginner",),
        "audience": "kids",
        "capacity": 10,
        "seats_remaining": 4,
    },
    {
        "class_code": "adult_mon_1900",
        "class_name": "Adult",
        "day_of_week": "Monday",
        "time_local": "7:00 PM",
        "duration_minutes": 60,
        "level_targets": ("beginner", "intermediate"),
        "audience": "adult",
        "capacity": 12,
        "seats_remaining": 5,
    },
    {
        "class_code": "intermediate_wed_1600",
        "class_name": "Intermediate",
        "day_of_week": "Wednesday",
        "time_local": "4:00 PM",
        "duration_minutes": 60,
        "level_targets": ("intermediate",),
        "audience": "mixed",
        "capacity": 10,
        "seats_remaining": 3,
    },
    {
        "class_code": "advanced_wed_1900",
        "class_name": "Advanced",
        "day_of_week": "Wednesday",
        "time_local": "7:00 PM",
        "duration_minutes": 60,
        "level_targets": ("advanced", "tournament"),
        "audience": "mixed",
        "capacity": 8,
        "seats_remaining": 2,
    },
    {
        "class_code": "practice_fri_1600",
        "class_name": "Practice",
        "day_of_week": "Friday",
        "time_local": "4:00 PM",
        "duration_minutes": 60,
        "level_targets": ("intermediate", "advanced"),
        "audience": "mixed",
        "capacity": 14,
        "seats_remaining": 6,
    },
    {
        "class_code": "tournament_fri_1900",
        "class_name": "Tournament",
        "day_of_week": "Friday",
        "time_local": "7:00 PM",
        "duration_minutes": 60,
        "level_targets": ("tournament", "advanced"),
        "audience": "mixed",
        "capacity": 8,
        "seats_remaining": 1,
    },
)

SUBSCRIPTION_PLANS: tuple[dict[str, Any], ...] = (
    {
        "plan_code": "starter_1x_week",
        "label": "1 class per week",
        "monthly_price_aud": 120,
        "classes_per_week": 1,
    },
    {
        "plan_code": "growth_2x_week",
        "label": "2 classes per week",
        "monthly_price_aud": 240,
        "classes_per_week": 2,
    },
)


@dataclass(frozen=True)
class AssessmentEvaluation:
    score: int
    level: str
    level_label: str
    completed: bool
    answered_question_ids: list[str]
    missing_question_ids: list[str]
    score_breakdown: list[dict[str, Any]]


def list_assessment_questions() -> list[dict[str, Any]]:
    return [
        {
            "question_id": question["question_id"],
            "step": question["step"],
            "prompt": question["prompt"],
            "choices": [
                {
                    "answer_id": choice["answer_id"],
                    "label": choice["label"],
                }
                for choice in question["choices"]
            ],
        }
        for question in ASSESSMENT_QUESTIONS
    ]


def score_answers(answer_map: dict[str, str]) -> AssessmentEvaluation:
    answered_question_ids: list[str] = []
    missing_question_ids: list[str] = []
    score_breakdown: list[dict[str, Any]] = []
    total_score = 0

    for question in ASSESSMENT_QUESTIONS:
        question_id = str(question["question_id"])
        answer_id = str(answer_map.get(question_id) or "").strip()
        if not answer_id:
            missing_question_ids.append(question_id)
            continue

        matched_choice = next(
            (choice for choice in question["choices"] if choice["answer_id"] == answer_id),
            None,
        )
        if matched_choice is None:
            missing_question_ids.append(question_id)
            continue

        answered_question_ids.append(question_id)
        score = int(matched_choice["score"])
        total_score += score
        score_breakdown.append(
            {
                "question_id": question_id,
                "answer_id": answer_id,
                "label": matched_choice["label"],
                "score": score,
            }
        )

    level_band = next(
        (
            band
            for band in LEVEL_BANDS
            if int(band["min_score"]) <= total_score <= int(band["max_score"])
        ),
        LEVEL_BANDS[0],
    )
    return AssessmentEvaluation(
        score=total_score,
        level=str(level_band["level"]),
        level_label=str(level_band["label"]),
        completed=len(missing_question_ids) == 0,
        answered_question_ids=answered_question_ids,
        missing_question_ids=missing_question_ids,
        score_breakdown=score_breakdown,
    )


def validate_answers(answers: list[dict[str, str]]) -> dict[str, str]:
    valid_choices = {
        str(question["question_id"]): {
            str(choice["answer_id"])
            for choice in question["choices"]
        }
        for question in ASSESSMENT_QUESTIONS
    }
    normalized: dict[str, str] = {}
    for entry in answers:
        question_id = str(entry.get("question_id") or "").strip()
        answer_id = str(entry.get("answer_id") or "").strip()
        if question_id not in valid_choices:
            raise ValueError(f"Unknown question_id: {question_id or '<blank>'}")
        if answer_id not in valid_choices[question_id]:
            raise ValueError(f"Unknown answer_id '{answer_id or '<blank>'}' for {question_id}")
        normalized[question_id] = answer_id
    return normalized


def next_question(answer_map: dict[str, str]) -> dict[str, Any] | None:
    answered = set(answer_map)
    for question in list_assessment_questions():
        if question["question_id"] not in answered:
            return question
    return None


def build_class_availability(
    *,
    level: str | None = None,
    student_age: int | None = None,
) -> list[dict[str, Any]]:
    normalized_level = str(level or "").strip().lower() or None
    wants_kids = student_age is not None and student_age <= 15
    slots: list[dict[str, Any]] = []
    for class_item in CLASS_TEMPLATE:
        item = dict(class_item)
        level_targets = tuple(item.get("level_targets") or ())
        recommended = False
        if normalized_level:
            recommended = normalized_level in level_targets
            if normalized_level == "beginner" and wants_kids and item["class_code"] == "kids_mon_1600":
                recommended = True
            if normalized_level == "beginner" and not wants_kids and item["class_code"] == "adult_mon_1900":
                recommended = True
        item["recommended"] = recommended
        item["availability_state"] = (
            "available" if int(item["seats_remaining"]) > 1 else "limited_availability"
        )
        slots.append(item)
    return slots


def placement_recommendation(
    *,
    evaluation: AssessmentEvaluation,
    student_age: int | None = None,
) -> dict[str, Any]:
    slots = build_class_availability(level=evaluation.level, student_age=student_age)

    primary_code = "adult_mon_1900"
    secondary_codes: tuple[str, ...] = ()
    if evaluation.level == "beginner":
        primary_code = "kids_mon_1600" if student_age is not None and student_age <= 15 else "adult_mon_1900"
    elif evaluation.level == "intermediate":
        primary_code = "intermediate_wed_1600"
        secondary_codes = ("practice_fri_1600",)
    elif evaluation.level == "advanced":
        primary_code = "advanced_wed_1900"
        secondary_codes = ("practice_fri_1600",)
    elif evaluation.level == "tournament":
        primary_code = "tournament_fri_1900"
        secondary_codes = ("advanced_wed_1900",)

    primary_class = next(slot for slot in slots if slot["class_code"] == primary_code)
    alternate_slots = [
        slot
        for slot in slots
        if slot["class_code"] in secondary_codes or (slot["recommended"] and slot["class_code"] != primary_code)
    ]

    suggested_plan = SUBSCRIPTION_PLANS[0]
    if evaluation.level in {"advanced", "tournament"}:
        suggested_plan = SUBSCRIPTION_PLANS[1]
    elif evaluation.level == "intermediate" and alternate_slots:
        suggested_plan = SUBSCRIPTION_PLANS[1]

    rationale = {
        "beginner": "Start with a guided fundamentals class to build board vision and confidence.",
        "intermediate": "Place into the structured intermediate lane with optional practice for repetition.",
        "advanced": "Use the advanced class plus practice volume to sharpen tactics and match readiness.",
        "tournament": "Prioritize tournament-style training with the advanced lane as weekly reinforcement.",
    }[evaluation.level]

    return {
        "program_code": PROGRAM_CODE,
        "score": evaluation.score,
        "level": evaluation.level,
        "level_label": evaluation.level_label,
        "score_band": next(
            band for band in LEVEL_BANDS if str(band["level"]) == evaluation.level
        ),
        "primary_class": primary_class,
        "alternate_slots": alternate_slots,
        "recommended_slots": [slot for slot in slots if slot["recommended"]],
        "subscription_suggestion": {
            **suggested_plan,
            "billing_model": "subscription",
            "currency_code": "AUD",
            "unit_price_aud": 30,
        },
        "retention_notes": [
            "Track progress weekly and convert GM notes into a parent-facing report.",
            "Use monthly subscription billing to protect recurring class revenue.",
        ],
        "rationale": rationale,
    }


def build_assessment_summary(
    *,
    answer_map: dict[str, str],
    student_age: int | None = None,
) -> dict[str, Any]:
    evaluation = score_answers(answer_map)
    summary: dict[str, Any] = {
        "template_version": ASSESSMENT_TEMPLATE_VERSION,
        "score": evaluation.score,
        "level": evaluation.level,
        "level_label": evaluation.level_label,
        "completed": evaluation.completed,
        "answered_question_ids": evaluation.answered_question_ids,
        "missing_question_ids": evaluation.missing_question_ids,
        "score_breakdown": evaluation.score_breakdown,
    }
    if evaluation.completed:
        summary["placement"] = placement_recommendation(
            evaluation=evaluation,
            student_age=student_age,
        )
    return summary


def build_parent_report_preview(
    *,
    student_name: str | None,
    guardian_name: str | None,
    assessment_level: str | None,
    assessment_summary: str | None,
    class_label: str | None,
    plan_label: str | None,
    slot_label: str | None,
    service_name: str | None = None,
) -> dict[str, Any]:
    safe_student_name = str(student_name or "").strip() or "the student"
    safe_guardian_name = str(guardian_name or "").strip() or "Parent"
    safe_level = str(assessment_level or "").strip() or "beginner"
    safe_class_label = str(class_label or "").strip() or "guided chess class"
    safe_plan_label = str(plan_label or "").strip() or "weekly academy plan"
    safe_slot_label = str(slot_label or "").strip() or "the recommended class slot"
    safe_service_name = str(service_name or "").strip() or safe_class_label

    strengths_map = {
        "beginner": [
            "Shows readiness to learn rules, board awareness, and disciplined turn-taking.",
            "Can build confidence quickly with guided puzzles and repetition.",
        ],
        "intermediate": [
            "Already has enough fundamentals to benefit from structured tactical repetition.",
            "Ready to turn basic understanding into more consistent game decisions.",
        ],
        "advanced": [
            "Can handle stronger tactical and strategic coaching with less hand-holding.",
            "Ready for higher-volume training and deeper calculation work.",
        ],
        "tournament": [
            "Shows the strongest readiness for competitive play and tournament-style coaching.",
            "Can benefit from advanced review, preparation, and performance tracking.",
        ],
    }
    focus_map = {
        "beginner": ["Piece movement fluency", "Check/checkmate patterns", "Board confidence"],
        "intermediate": ["Tactical pattern recognition", "Calculation discipline", "Practice-game review"],
        "advanced": ["Opening structure", "Calculation depth", "Practical conversion"],
        "tournament": ["Tournament preparation", "Game review quality", "Competitive consistency"],
    }
    homework_map = {
        "beginner": ["3 mate-in-1 puzzles", "Name every piece and legal move", "Play 1 guided practice game"],
        "intermediate": ["5 tactical puzzles", "Review one full game", "Practice checkmating patterns"],
        "advanced": ["Opening review for one line", "5 calculation puzzles", "Annotated training game"],
        "tournament": ["Tournament game analysis", "Advanced tactic set", "Opening prep notes"],
    }

    strengths = strengths_map.get(safe_level, strengths_map["beginner"])
    focus_areas = focus_map.get(safe_level, focus_map["beginner"])
    homework = homework_map.get(safe_level, homework_map["beginner"])

    return {
        "student_name": safe_student_name,
        "guardian_name": safe_guardian_name,
        "headline": f"{safe_student_name} is ready for the {safe_class_label} pathway.",
        "summary": str(assessment_summary or "").strip()
        or f"BookedAI assessed {safe_student_name} at the {safe_level} stage and recommends continuing through {safe_service_name}.",
        "strengths": strengths,
        "focus_areas": focus_areas,
        "homework": homework,
        "next_class_suggestion": {
            "class_label": safe_class_label,
            "slot_label": safe_slot_label,
            "plan_label": safe_plan_label,
        },
        "parent_cta": f"{safe_guardian_name}, keep momentum by confirming {safe_plan_label} and attending {safe_slot_label}.",
        "retention_reasoning": "This preview turns progress into something the parent can understand, pay for, and continue month to month.",
    }
