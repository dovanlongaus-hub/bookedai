"""Default customer-facing BookedAI booking support identity."""

DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL = "info@bookedai.au"
DEFAULT_CUSTOMER_BOOKING_SUPPORT_PHONE = "+61455301335"
DEFAULT_CUSTOMER_BOOKING_SUPPORT_CHANNELS = ("Telegram", "WhatsApp", "iMessage")


def customer_booking_support_label() -> str:
    channels = "/".join(DEFAULT_CUSTOMER_BOOKING_SUPPORT_CHANNELS)
    return f"BookedAI support ({channels})"
