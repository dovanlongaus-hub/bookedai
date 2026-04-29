"""Localised email copy for the AI Mentor 1-1 Pro tenant.

Single source of truth for EN / VI subjects + bodies used by:
  * monthly_reminder_worker (monthly check-in)
  * lifecycle / welcome flow (post-booking welcome)
  * feedback_request_worker (per-session feedback ask) — re-used existing strings

Locale resolution is deliberately conservative: callers pass a normalised
``locale`` value of ``"en"`` or ``"vi"``; anything else falls back to ``"en"``
to preserve current behaviour for partners who have not opted in to VI yet.

This module owns the *copy*, not the HTML rendering — so workers can call
``select_strings(locale).monthly_check_in_subject`` etc. without coupling to
template format. The matching reference HTML files live in
``backend/integrations/email_templates/aimentor_*.{en,vi}.html``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Locale = Literal["en", "vi"]


@dataclass(frozen=True)
class _MonthlyCheckIn:
    subject: str
    greeting_template: str  # "Hi {name},"
    body_with_service_template: str  # uses {service_name} + {booking_reference}
    body_without_service_template: str  # uses {booking_reference}
    progress_prompt: str
    portal_cta: str
    feedback_link_label: str
    unsubscribe_note: str
    signature: str


@dataclass(frozen=True)
class _Welcome:
    subject_template: str  # uses {service_name}
    greeting_template: str
    intro_template: str  # uses {service_name} + {booking_reference}
    next_steps_lead: str
    next_steps: tuple[str, ...]
    meeting_block_lead: str
    meeting_video_label: str
    meeting_calendar_label: str
    add_to_calendar_cta: str
    portal_cta: str
    channel_lead: str
    telegram_label: str
    whatsapp_label: str
    email_label: str
    signature: str


@dataclass(frozen=True)
class _PaymentReminder:
    subject_template: str  # uses {service_name}
    greeting_template: str
    body_template: str  # uses {service_name} + {booking_reference}
    pay_cta: str
    portal_link_label: str
    signature: str


@dataclass(frozen=True)
class _Cancellation:
    """Sent when the mentor clicks 'Cancel' on a reservation in the
    Reservations panel. Tells the learner the slot is freed + how to
    re-book or talk to the mentor about a replacement time.
    """

    subject_template: str  # uses {service_name}
    greeting_template: str
    body_template: str  # uses {service_name} + {booking_reference} + {slot_line}
    rebook_lead: str
    rebook_cta: str
    rebook_url: str
    refund_note: str
    channel_lead: str
    telegram_label: str
    whatsapp_label: str
    signature: str


@dataclass(frozen=True)
class _Completion:
    """Sent when the mentor marks a reservation 'Complete'. Thanks the
    learner, surfaces the feedback link, and primes them for the next
    program.
    """

    subject_template: str  # uses {service_name}
    greeting_template: str
    body_template: str  # uses {service_name} + {booking_reference}
    feedback_lead: str
    feedback_cta: str
    next_program_lead: str
    next_program_cta: str
    next_program_url: str
    signature: str


@dataclass(frozen=True)
class AIMentorEmailStrings:
    locale: Locale
    monthly_check_in: _MonthlyCheckIn
    welcome: _Welcome
    payment_reminder: _PaymentReminder
    cancellation: _Cancellation
    completion: _Completion


_EN = AIMentorEmailStrings(
    locale="en",
    monthly_check_in=_MonthlyCheckIn(
        subject="Your AI Mentor monthly check-in",
        greeting_template="Hi {name},",
        body_with_service_template=(
            "It's been a month since your AI Mentor booking ({service_name}, "
            "reference {booking_reference})."
        ),
        body_without_service_template=(
            "It's been a month since your AI Mentor booking ({booking_reference})."
        ),
        progress_prompt=(
            "How's your progress? Tap below to log a quick check-in or jump back into a session."
        ),
        portal_cta="Open my AI Mentor portal",
        feedback_link_label="Send your feedback",
        unsubscribe_note=(
            "If you'd rather skip these monthly check-ins, reply to this email and we'll turn them off."
        ),
        signature="— The AI Mentor team",
    ),
    welcome=_Welcome(
        subject_template="Welcome to AI Mentor 1-1 Pro — {service_name}",
        greeting_template="Hi {name},",
        intro_template=(
            "Thanks for booking {service_name} with AI Mentor 1-1 Pro. "
            "Your reference is {booking_reference}. Sessions are 100% online."
        ),
        next_steps_lead="Here's what happens next:",
        next_steps=(
            "Your mentor will reach out within 24 hours to confirm the slot and your goals.",
            "You'll receive a Google Calendar invite + .ics attachment in a follow-up email.",
            "Session runs on Zoho Meeting — HD video, screen share, auto-recording you keep.",
            "Monthly progress check-ins start automatically after your first session.",
        ),
        meeting_block_lead="How your session will run",
        meeting_video_label=(
            "Zoho Meeting — HD video, screen share, auto-recording yours to keep"
        ),
        meeting_calendar_label=(
            "Google Calendar invite + .ics attachment land in your email after mentor confirms"
        ),
        add_to_calendar_cta="Add to my calendar",
        portal_cta="Open my AI Mentor portal",
        channel_lead="Prefer a different channel? Pick one:",
        telegram_label="Continue on Telegram",
        whatsapp_label="Continue on WhatsApp",
        email_label="Email mentor",
        signature="— The AI Mentor team",
    ),
    payment_reminder=_PaymentReminder(
        subject_template="Quick payment reminder — {service_name}",
        greeting_template="Hi {name},",
        body_template=(
            "Your booking for {service_name} (reference {booking_reference}) "
            "is still waiting on payment. Tap below to complete Stripe checkout."
        ),
        pay_cta="Complete payment",
        portal_link_label="Open my booking",
        signature="— The AI Mentor team",
    ),
    cancellation=_Cancellation(
        subject_template="Your AI Mentor session was cancelled — {service_name}",
        greeting_template="Hi {name},",
        body_template=(
            "Your AI Mentor session for {service_name} (booking "
            "{booking_reference}) was cancelled. Originally scheduled for "
            "{slot_line}."
        ),
        rebook_lead=(
            "No friction — pick a new slot below or message the mentor for a "
            "custom time."
        ),
        rebook_cta="Pick a new slot",
        rebook_url="https://aimentor.bookedai.au/#programs",
        refund_note=(
            "If you paid for this session, the refund is on its way per the "
            "7-day money-back policy. Stripe receipts go to the same address."
        ),
        channel_lead="Need to talk to the mentor first?",
        telegram_label="Continue on Telegram",
        whatsapp_label="Continue on WhatsApp",
        signature="— The AI Mentor team",
    ),
    completion=_Completion(
        subject_template="Session complete — what did you build? ({service_name})",
        greeting_template="Hi {name},",
        body_template=(
            "Thanks for showing up to your AI Mentor session ({service_name}, "
            "booking {booking_reference}). We hope you walked away with "
            "something deployable — that's the whole point."
        ),
        feedback_lead=(
            "Two minutes of feedback help us shape the next session for you "
            "(and shape the program for the Founding Cohort)."
        ),
        feedback_cta="Send my feedback",
        next_program_lead=(
            "Ready to push further? Most students step from \"first AI app\" "
            "into the 5-hour automation track once their prototype is real."
        ),
        next_program_cta="Browse the next program",
        next_program_url="https://aimentor.bookedai.au/#programs",
        signature="— The AI Mentor team",
    ),
)

_VI = AIMentorEmailStrings(
    locale="vi",
    monthly_check_in=_MonthlyCheckIn(
        subject="AI Mentor — Check-in tháng",
        greeting_template="Chào {name},",
        body_with_service_template=(
            "Đã một tháng kể từ khi bạn đặt {service_name} với AI Mentor "
            "(mã: {booking_reference})."
        ),
        body_without_service_template=(
            "Đã một tháng kể từ booking AI Mentor của bạn ({booking_reference})."
        ),
        progress_prompt=(
            "Tiến độ của bạn thế nào? Bấm bên dưới để check-in nhanh hoặc đặt buổi tiếp theo."
        ),
        portal_cta="Mở portal AI Mentor",
        feedback_link_label="Gửi phản hồi",
        unsubscribe_note=(
            "Nếu bạn muốn dừng check-in tháng, trả lời email này và chúng tôi sẽ tắt."
        ),
        signature="— Đội AI Mentor",
    ),
    welcome=_Welcome(
        subject_template="Chào mừng tới AI Mentor 1-1 Pro — {service_name}",
        greeting_template="Chào {name},",
        intro_template=(
            "Cảm ơn bạn đã đặt {service_name} với AI Mentor 1-1 Pro. "
            "Mã booking của bạn là {booking_reference}. Toàn bộ buổi học 100% online."
        ),
        next_steps_lead="Bước tiếp theo:",
        next_steps=(
            "Mentor sẽ liên hệ trong 24 giờ để xác nhận slot và mục tiêu của bạn.",
            "Bạn sẽ nhận Google Calendar invite + file .ics đính kèm trong email tiếp theo.",
            "Buổi học chạy trên Zoho Meeting — HD, share màn hình, tự ghi hình bạn giữ.",
            "Sau buổi đầu, hệ thống tự bật check-in tiến độ hàng tháng.",
        ),
        meeting_block_lead="Buổi học của bạn sẽ chạy thế nào",
        meeting_video_label=(
            "Zoho Meeting — HD, share màn hình, tự ghi hình bạn giữ lại"
        ),
        meeting_calendar_label=(
            "Google Calendar invite + file .ics gửi vào email sau khi mentor xác nhận"
        ),
        add_to_calendar_cta="Thêm vào lịch của tôi",
        portal_cta="Mở portal AI Mentor",
        channel_lead="Muốn đổi kênh? Chọn một trong các kênh sau:",
        telegram_label="Tiếp tục qua Telegram",
        whatsapp_label="Tiếp tục qua WhatsApp",
        email_label="Email cho mentor",
        signature="— Đội AI Mentor",
    ),
    payment_reminder=_PaymentReminder(
        subject_template="Nhắc thanh toán — {service_name}",
        greeting_template="Chào {name},",
        body_template=(
            "Booking {service_name} của bạn (mã {booking_reference}) "
            "đang chờ thanh toán. Bấm bên dưới để hoàn tất Stripe checkout."
        ),
        pay_cta="Hoàn tất thanh toán",
        portal_link_label="Mở booking",
        signature="— Đội AI Mentor",
    ),
    cancellation=_Cancellation(
        subject_template="Buổi học AI Mentor đã huỷ — {service_name}",
        greeting_template="Chào {name},",
        body_template=(
            "Buổi học AI Mentor cho {service_name} (mã booking "
            "{booking_reference}) đã được huỷ. Lịch ban đầu là {slot_line}."
        ),
        rebook_lead=(
            "Không vấn đề gì — chọn slot mới bên dưới hoặc nhắn mentor để chọn "
            "giờ tuỳ chỉnh."
        ),
        rebook_cta="Chọn slot mới",
        rebook_url="https://aimentor.bookedai.au/#programs",
        refund_note=(
            "Nếu bạn đã thanh toán, refund sẽ được xử lý theo chính sách "
            "hoàn tiền 7 ngày. Hoá đơn Stripe gửi về cùng email."
        ),
        channel_lead="Muốn trao đổi với mentor trước?",
        telegram_label="Tiếp tục qua Telegram",
        whatsapp_label="Tiếp tục qua WhatsApp",
        signature="— Đội AI Mentor",
    ),
    completion=_Completion(
        subject_template="Buổi học hoàn tất — bạn đã xây gì? ({service_name})",
        greeting_template="Chào {name},",
        body_template=(
            "Cảm ơn bạn đã tới buổi AI Mentor ({service_name}, mã booking "
            "{booking_reference}). Hy vọng bạn ra về với một sản phẩm có thể "
            "deploy — đó là mục tiêu."
        ),
        feedback_lead=(
            "Hai phút feedback giúp định hình buổi tiếp theo cho bạn (và "
            "định hình chương trình cho Cohort Khởi Tạo)."
        ),
        feedback_cta="Gửi phản hồi",
        next_program_lead=(
            "Sẵn sàng đẩy tiếp? Đa số học viên chuyển từ \"app AI đầu tiên\" "
            "sang track 5 giờ tự động hoá ngay sau khi prototype thật chạy."
        ),
        next_program_cta="Xem chương trình tiếp",
        next_program_url="https://aimentor.bookedai.au/#programs",
        signature="— Đội AI Mentor",
    ),
)


_STRINGS_BY_LOCALE: dict[str, AIMentorEmailStrings] = {"en": _EN, "vi": _VI}


def select_strings(locale: str | None) -> AIMentorEmailStrings:
    """Return the AI Mentor email copy bundle for ``locale``.

    Anything outside ``{"en", "vi"}`` falls back to English to preserve the
    current behaviour for partners who have not enabled VI yet.
    """
    raw = (locale or "").strip().lower()
    # Tolerate ``en-US``, ``vi-VN`` and similar by mapping the prefix.
    prefix = raw.split("-", 1)[0]
    return _STRINGS_BY_LOCALE.get(prefix, _EN)


def normalise_locale(locale: str | None) -> Locale:
    """Coerce an arbitrary string to one of the two supported locale tags."""
    raw = (locale or "").strip().lower().split("-", 1)[0]
    if raw == "vi":
        return "vi"
    return "en"


__all__ = [
    "AIMentorEmailStrings",
    "Locale",
    "select_strings",
    "normalise_locale",
]
