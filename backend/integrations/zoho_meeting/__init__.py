"""Zoho Meeting integration package.

Reuses the same OAuth refresh-token + client credentials that the existing
``zoho_crm`` adapter uses. The Zoho consent screen must include the
``ZohoMeeting.session.ALL`` scope alongside the existing CRM scopes — the
refresh token grants access to whichever scopes were authorised at consent
time.
"""

from integrations.zoho_meeting.adapter import ZohoMeetingAdapter

__all__ = ["ZohoMeetingAdapter"]
