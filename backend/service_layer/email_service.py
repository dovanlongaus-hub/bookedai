from __future__ import annotations

import asyncio
import imaplib
import smtplib
from email import message_from_bytes
from email.message import EmailMessage
from email.policy import default
from email.utils import parseaddr

from config import Settings
from schemas import InboxEmail


class EmailService:
    settings: Settings

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @staticmethod
    def _unique_recipients(*groups: list[str] | None) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for group in groups:
            if not group:
                continue
            for value in group:
                normalized = str(value or "").strip().lower()
                if not normalized or normalized in seen:
                    continue
                seen.add(normalized)
                result.append(normalized)
        return result

    def smtp_configured(self) -> bool:
        return all(
            [
                self.settings.email_smtp_host,
                self.settings.email_smtp_port > 0,
                self.settings.email_smtp_username,
                self.settings.email_smtp_password,
                self.settings.email_smtp_from,
            ]
        )

    def imap_configured(self) -> bool:
        return all(
            [
                self.settings.email_imap_host,
                self.settings.email_imap_port > 0,
                self.settings.email_imap_username,
                self.settings.email_imap_password,
            ]
        )

    async def send_email(
        self,
        *,
        to: list[str],
        cc: list[str] | None = None,
        subject: str,
        text: str,
        html: str | None = None,
    ) -> None:
        if not self.smtp_configured():
            raise ValueError("SMTP is not fully configured")

        normalized_to = self._unique_recipients(to)
        normalized_cc = [email for email in self._unique_recipients(cc) if email not in normalized_to]
        if not normalized_to:
            raise ValueError("At least one recipient email is required")

        await asyncio.to_thread(
            self._send_email_sync,
            to=normalized_to,
            cc=normalized_cc,
            subject=subject,
            text=text,
            html=html,
        )

    def _send_email_sync(
        self,
        *,
        to: list[str],
        cc: list[str] | None = None,
        subject: str,
        text: str,
        html: str | None = None,
    ) -> None:
        message = EmailMessage()
        message["From"] = self.settings.email_smtp_from
        message["To"] = ", ".join(to)
        if cc:
            message["Cc"] = ", ".join(cc)
        message["Subject"] = subject
        message.set_content(text)
        if html:
            message.add_alternative(html, subtype="html")

        if self.settings.email_smtp_use_tls:
            server: smtplib.SMTP = smtplib.SMTP_SSL(
                self.settings.email_smtp_host,
                self.settings.email_smtp_port,
                timeout=20,
            )
        else:
            server = smtplib.SMTP(
                self.settings.email_smtp_host,
                self.settings.email_smtp_port,
                timeout=20,
            )

        try:
            server.ehlo()
            if self.settings.email_smtp_use_starttls and not self.settings.email_smtp_use_tls:
                server.starttls()
                server.ehlo()
            server.login(
                self.settings.email_smtp_username,
                self.settings.email_smtp_password,
            )
            server.send_message(message)
        finally:
            server.quit()

    async def fetch_inbox(self, limit: int = 20) -> list[InboxEmail]:
        if not self.imap_configured():
            raise ValueError("IMAP is not fully configured")
        if limit < 1:
            return []
        return await asyncio.to_thread(self._fetch_inbox_sync, limit)

    def _fetch_inbox_sync(self, limit: int) -> list[InboxEmail]:
        if self.settings.email_imap_use_ssl:
            mailbox: imaplib.IMAP4 = imaplib.IMAP4_SSL(
                self.settings.email_imap_host,
                self.settings.email_imap_port,
            )
        else:
            mailbox = imaplib.IMAP4(
                self.settings.email_imap_host,
                self.settings.email_imap_port,
            )

        try:
            mailbox.login(
                self.settings.email_imap_username,
                self.settings.email_imap_password,
            )
            mailbox.select(self.settings.email_imap_mailbox)
            status, data = mailbox.search(None, "ALL")
            if status != "OK" or not data:
                return []

            uids = [value for value in data[0].split() if value]
            selected = uids[-limit:]
            selected.reverse()

            result: list[InboxEmail] = []
            for uid in selected:
                fetch_status, msg_data = mailbox.fetch(uid, "(RFC822)")
                if fetch_status != "OK" or not msg_data:
                    continue
                raw = next((item[1] for item in msg_data if isinstance(item, tuple)), None)
                if not raw:
                    continue
                parsed = message_from_bytes(raw, policy=default)
                from_header = parseaddr(parsed.get("From", ""))[1] or parsed.get("From", "")
                subject = parsed.get("Subject", "")
                date = parsed.get("Date", "")
                snippet = self._extract_snippet(parsed)
                result.append(
                    InboxEmail(
                        uid=uid.decode(),
                        from_address=from_header,
                        subject=subject,
                        date=date,
                        snippet=snippet,
                    )
                )
            return result
        finally:
            try:
                mailbox.close()
            except Exception:
                pass
            mailbox.logout()

    @staticmethod
    def _extract_snippet(message: EmailMessage) -> str:
        if message.is_multipart():
            for part in message.walk():
                if part.get_content_type() == "text/plain":
                    text = part.get_content()
                    return str(text).strip()[:240]
        else:
            text = message.get_content()
            return str(text).strip()[:240]
        return ""
