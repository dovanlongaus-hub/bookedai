import { ActivityTimelineItem } from "@/lib/db/admin-repository";
import { AdminBadge } from "@/components/ui/admin-badge";

export function ActivityTimeline({
  items,
  emptyMessage,
}: {
  items: ActivityTimelineItem[];
  emptyMessage: string;
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <AdminBadge tone={item.tone ?? "default"}>{item.entityType}</AdminBadge>
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-950">{item.title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-700">{item.description}</div>
            </div>
            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
              {item.occurredAt.slice(0, 16).replace("T", " ")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
