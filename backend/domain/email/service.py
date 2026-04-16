from __future__ import annotations

from core.contracts.email import EmailMessagePayloadContract


class EmailCommunicationsService:
    """Foundation seam for template-based transactional and lifecycle emails."""

    def build_message(
        self,
        *,
        template_key: str,
        to: list[str],
        subject: str,
        variables: dict[str, str] | None = None,
    ) -> EmailMessagePayloadContract:
        return EmailMessagePayloadContract(
            template_key=template_key,  # type: ignore[arg-type]
            to=to,
            subject=subject,
            variables=variables or {},
        )

