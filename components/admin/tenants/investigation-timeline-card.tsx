import { AdminBadge } from "@/components/ui/admin-badge";
import { AdminCard } from "@/components/ui/admin-card";

export type InvestigationTimelineCardItem = {
  id: string;
  occurredAt: string;
  source: string;
  title: string;
  description: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
};

export function InvestigationTimelineCard({
  items,
  formatDateLabel,
}: {
  items: InvestigationTimelineCardItem[];
  formatDateLabel: (value?: string | null) => string;
}) {
  return (
    <AdminCard className="p-6 xl:col-span-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Unified activity timeline</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This feed merges tenant access, billing, CRM, integration, and support-session signals into one read-only view so teams can review tenant issues in sequence instead of hopping across separate cards.
          </p>
        </div>
        <AdminBadge tone="info">{items.length} signals</AdminBadge>
      </div>
      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminBadge tone={item.tone}>{item.source}</AdminBadge>
                    <div className="text-xs text-slate-500">{formatDateLabel(item.occurredAt)}</div>
                  </div>
                  <div className="mt-3 text-sm font-semibold text-slate-950">{item.title}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">{item.description}</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            No activity signals are available yet for this tenant.
          </div>
        )}
      </div>
    </AdminCard>
  );
}
