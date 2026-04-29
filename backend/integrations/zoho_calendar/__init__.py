"""Zoho Calendar integration package.

Reuses the same OAuth refresh-token + client credentials as the existing
``zoho_crm`` adapter. Add ``ZohoCalendar.event.ALL`` to the consent screen.
"""

from integrations.zoho_calendar.adapter import ZohoCalendarAdapter

__all__ = ["ZohoCalendarAdapter"]
