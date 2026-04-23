import type { TenantSectionActivity } from '../../shared/contracts';

function formatActivityTime(value: string | null | undefined) {
  if (!value) {
    return 'Not recorded yet';
  }
  try {
    return new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function TenantSectionActivityCard({
  label = 'Section activity',
  activity,
}: {
  label?: string;
  activity: TenantSectionActivity;
}) {
  return (
    <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{activity.summary}</div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
          Updated {formatActivityTime(activity.last_updated_at)}
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
          By {activity.last_updated_by || 'BookedAI workspace'}
        </span>
      </div>
    </div>
  );
}
