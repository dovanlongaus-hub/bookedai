from __future__ import annotations

from typing import Any
from urllib.parse import quote


def build_manual_followup_url(
    *,
    booking_reference: str,
    service_name: str,
    business_recipient: str,
    customer_name: str,
    customer_email: str | None,
    customer_phone: str | None,
    requested_date: str,
    requested_time: str,
    timezone: str,
    notes: str | None,
) -> str:
    subject = quote(f"BookedAI booking request {booking_reference}")
    body = quote(
        "\n".join(
            [
                f"Booking reference: {booking_reference}",
                f"Service: {service_name}",
                f"Customer: {customer_name}",
                f"Email: {(customer_email or '').strip().lower() or 'Not provided'}",
                f"Phone: {customer_phone or 'Not provided'}",
                f"Requested date: {requested_date}",
                f"Requested time: {requested_time}",
                f"Timezone: {timezone}",
                f"Notes: {notes or 'None'}",
            ]
        )
    )
    return f"mailto:{business_recipient}?subject={subject}&body={body}"


def build_booking_customer_confirmation_text(
    *,
    booking_reference: str,
    service_name: str,
    requested_date: str,
    requested_time: str,
    timezone: str,
    amount_label: str,
    payment_url: str,
    business_email: str,
    meeting_join_url: str | None,
    meeting_event_url: str | None,
    calendar_add_url: str | None,
) -> str:
    lines = [
        "Thanks for booking with BookedAI.",
        "",
        f"Booking reference: {booking_reference}",
        f"Service: {service_name}",
        f"Requested date: {requested_date}",
        f"Requested time: {requested_time}",
        f"Timezone: {timezone}",
        f"Price: {amount_label}",
    ]
    if meeting_event_url:
        lines.append(f"Calendar event: {meeting_event_url}")
    if meeting_join_url:
        lines.append(f"Calendar join link: {meeting_join_url}")
    if calendar_add_url:
        lines.append(f"Add to Google Calendar: {calendar_add_url}")
    lines.extend([
        "",
        f"Payment and confirmation link: {payment_url}",
        "",
        f"If you need help, reply to {business_email}.",
    ])
    return "\n".join(lines)


def build_booking_internal_notification_text(
    *,
    booking_reference: str,
    service_name: str,
    customer_name: str,
    customer_email: str | None,
    customer_phone: str | None,
    requested_date: str,
    requested_time: str,
    timezone: str,
    notes: str | None,
    payment_url: str,
    meeting_join_url: str | None,
    meeting_event_url: str | None,
    calendar_add_url: str | None,
) -> str:
    lines = [
        "New booking assistant lead received.",
        "",
        f"Reference: {booking_reference}",
        f"Service: {service_name}",
        f"Customer: {customer_name}",
        f"Email: {(customer_email or '').strip().lower() or 'Not provided'}",
        f"Phone: {customer_phone or 'Not provided'}",
        f"Requested date: {requested_date}",
        f"Requested time: {requested_time}",
        f"Timezone: {timezone}",
        f"Notes: {notes or 'None'}",
        f"Payment URL: {payment_url}",
    ]
    if meeting_event_url:
        lines.append(f"Calendar event: {meeting_event_url}")
    if meeting_join_url:
        lines.append(f"Calendar join link: {meeting_join_url}")
    if calendar_add_url:
        lines.append(f"Add to Google Calendar: {calendar_add_url}")
    return "\n".join(lines)


def build_consultation_customer_confirmation_text(
    *,
    consultation_reference: str,
    public_package_name: str,
    amount_label: str,
    trial_summary: str,
    business_name: str,
    business_type: str,
    onboarding_mode: str,
    preferred_date: str,
    preferred_time: str,
    timezone: str,
    referral_partner: str | None,
    referral_location: str | None,
    source_section: str | None,
    source_cta: str | None,
    travel_fee_note: str | None,
    meeting_join_url: str | None,
    meeting_event_url: str | None,
    payment_url: str | None,
    notes: str | None,
) -> str:
    lines = [
        f"Thanks for booking BookedAI {public_package_name}.",
        "",
        f"Consultation reference: {consultation_reference}",
        f"Package: {public_package_name} ({amount_label})",
        f"Offer: {trial_summary}",
        f"Business: {business_name}",
        f"Business type: {business_type}",
        f"Setup mode: {onboarding_mode}",
        f"Preferred time: {preferred_date} {preferred_time} {timezone}",
    ]
    if referral_partner:
        lines.append(f"Referral partner: {referral_partner.strip()}")
    if referral_location:
        lines.append(f"Referral location: {referral_location.strip()}")
    if source_section or source_cta:
        lines.append(f"Source: {(source_section or 'unknown')} / {(source_cta or 'unknown')}")
    if travel_fee_note:
        lines.append(travel_fee_note)
    if meeting_join_url:
        lines.extend(["", f"Zoho meeting link: {meeting_join_url}"])
    if meeting_event_url:
        lines.append(f"Zoho calendar event: {meeting_event_url}")
    if payment_url:
        lines.extend(["", f"Stripe checkout: {payment_url}"])
    if notes:
        lines.extend(["", f"Notes: {notes.strip()}"])
    lines.extend(["", "A confirmation copy has also been sent to info@bookedai.au."])
    return "\n".join(lines)


def build_consultation_internal_notification_text(
    *,
    consultation_reference: str,
    internal_plan_id: str,
    public_package_name: str,
    customer_name: str,
    customer_email: str,
    customer_phone: str | None,
    business_name: str,
    business_type: str,
    onboarding_mode: str,
    preferred_date: str,
    preferred_time: str,
    timezone: str,
    referral_partner: str | None,
    referral_location: str | None,
    source_section: str | None,
    source_cta: str | None,
    source_path: str | None,
    travel_fee_note: str | None,
    meeting_join_url: str | None,
    meeting_event_url: str | None,
    payment_url: str | None,
    notes: str | None,
) -> str:
    lines = [
        "New BookedAI package onboarding booking received.",
        "",
        f"Reference: {consultation_reference}",
        f"Package: {public_package_name}",
        f"Internal plan id: {internal_plan_id}",
        f"Customer: {customer_name}",
        f"Email: {customer_email.strip().lower()}",
        f"Phone: {(customer_phone or '').strip() or 'Not provided'}",
        f"Business: {business_name}",
        f"Business type: {business_type}",
        f"Setup mode: {onboarding_mode}",
        f"Preferred time: {preferred_date} {preferred_time} {timezone}",
    ]
    if referral_partner:
        lines.append(f"Referral partner: {referral_partner.strip()}")
    if referral_location:
        lines.append(f"Referral location: {referral_location.strip()}")
    if source_section or source_cta:
        lines.append(f"Source: {(source_section or 'unknown')} / {(source_cta or 'unknown')}")
    if source_path:
        lines.append(f"Source path: {source_path}")
    if travel_fee_note:
        lines.append(travel_fee_note)
    if meeting_join_url:
        lines.append(f"Zoho meeting link: {meeting_join_url}")
    if meeting_event_url:
        lines.append(f"Zoho calendar event: {meeting_event_url}")
    if payment_url:
        lines.append(f"Stripe checkout: {payment_url}")
    if notes:
        lines.append(f"Notes: {notes.strip()}")
    return "\n".join(lines)


def build_demo_customer_confirmation_text(
    *,
    demo_reference: str,
    business_name: str,
    business_type: str,
    preferred_date: str,
    preferred_time: str,
    timezone: str,
    meeting_join_url: str | None,
    meeting_event_url: str | None,
    notes: str | None,
) -> str:
    lines = [
        "Thanks for booking a BookedAI live demo.",
        "",
        f"Demo reference: {demo_reference}",
        f"Business: {business_name}",
        f"Business type: {business_type}",
        f"Preferred time: {preferred_date} {preferred_time} {timezone}",
    ]
    if meeting_join_url:
        lines.extend(["", f"Zoho meeting link: {meeting_join_url}"])
    if meeting_event_url:
        lines.append(f"Zoho calendar event: {meeting_event_url}")
    if notes:
        lines.extend(["", f"Notes: {notes.strip()}"])
    lines.extend(["", "A confirmation copy has also been sent to info@bookedai.au."])
    return "\n".join(lines)


def build_demo_internal_notification_text(
    *,
    demo_reference: str,
    customer_name: str,
    customer_email: str,
    customer_phone: str | None,
    business_name: str,
    business_type: str,
    preferred_date: str,
    preferred_time: str,
    timezone: str,
    source_section: str | None,
    source_cta: str | None,
    source_path: str | None,
    meeting_join_url: str | None,
    meeting_event_url: str | None,
    notes: str | None,
) -> str:
    lines = [
        "New BookedAI demo request received.",
        "",
        f"Reference: {demo_reference}",
        f"Customer: {customer_name}",
        f"Email: {customer_email.strip().lower()}",
        f"Phone: {(customer_phone or '').strip() or 'Not provided'}",
        f"Business: {business_name}",
        f"Business type: {business_type}",
        f"Preferred time: {preferred_date} {preferred_time} {timezone}",
    ]
    if source_section or source_cta:
        lines.append(f"Source: {(source_section or 'unknown')} / {(source_cta or 'unknown')}")
    if source_path:
        lines.append(f"Source path: {source_path}")
    if meeting_join_url:
        lines.append(f"Zoho meeting link: {meeting_join_url}")
    if meeting_event_url:
        lines.append(f"Zoho calendar event: {meeting_event_url}")
    if notes:
        lines.append(f"Notes: {notes.strip()}")
    return "\n".join(lines)
