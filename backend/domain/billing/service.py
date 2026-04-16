from __future__ import annotations

from core.contracts.email import MonthlyReportSummaryContract
from core.contracts.payments import InvoiceSummaryContract


class BillingService:
    """Foundation seam for subscriptions, invoicing, reminders, and monthly summaries."""

    def build_invoice_summary(self, invoice_number: str | None = None) -> InvoiceSummaryContract:
        return InvoiceSummaryContract(invoice_number=invoice_number)

    def build_monthly_report(self, period_label: str | None = None) -> MonthlyReportSummaryContract:
        return MonthlyReportSummaryContract(period_label=period_label)

