import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiV1 } from '../../shared/api';
import type {
  TenantAuthSessionResponse,
  TenantStudentItem,
} from '../../shared/contracts';
import type {
  TenantCareListMember,
  TenantMonthlyReminderConfigResponse,
  TenantMonthlyReminderDispatchSummary,
} from '../../shared/api/v1';

type StoredTenantSession = TenantAuthSessionResponse;

interface TenantCareListWorkspaceProps {
  session: StoredTenantSession | null;
  students?: TenantStudentItem[] | null;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function nextMonthLabel(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleString('en-AU', { month: 'long', year: 'numeric' });
}

function nextMonthYyyyMm(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}


export function TenantCareListWorkspace({
  session,
  students = null,
}: TenantCareListWorkspaceProps) {
  const sessionToken = session?.session_token ?? null;
  const tenantRef = session?.tenant?.slug ?? null;

  const [members, setMembers] = useState<TenantCareListMember[]>([]);
  const [config, setConfig] = useState<TenantMonthlyReminderConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingPickerId, setPendingPickerId] = useState<string>('');

  const [dispatchSummary, setDispatchSummary] =
    useState<TenantMonthlyReminderDispatchSummary | null>(null);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);

  const memberIds = useMemo(() => new Set(members.map((m) => m.contact_id)), [members]);

  const filteredMembers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((m) => {
      const haystack = [
        m.full_name || '',
        m.email || '',
        m.phone || '',
        m.region || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [members, search]);

  const candidateStudents = useMemo(() => {
    if (!students) return [];
    return students.filter((s) => !memberIds.has(s.contact_id));
  }, [students, memberIds]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [careRes, configRes] = await Promise.all([
        apiV1.tenantCareListGet({ tenantRef }, sessionToken),
        apiV1.tenantMonthlyReminderConfigGet({ tenantRef }, sessionToken),
      ]);
      if (careRes.status !== 'ok') throw new Error('Failed to load care list.');
      if (configRes.status !== 'ok') throw new Error('Failed to load monthly reminder config.');
      setMembers(careRes.data.members ?? []);
      setConfig(configRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [sessionToken, tenantRef]);

  useEffect(() => {
    if (!sessionToken) return;
    void loadAll();
  }, [loadAll, sessionToken]);

  const addMember = useCallback(
    async (contactId: string) => {
      if (!contactId.trim()) return;
      setBusy(true);
      setError(null);
      setStatusMessage(null);
      try {
        const res = await apiV1.tenantCareListAdd(contactId.trim(), { tenantRef }, sessionToken);
        if (res.status !== 'ok') throw new Error('Add failed.');
        const newMember = res.data.member;
        setMembers((prev) => {
          if (prev.some((m) => m.contact_id === newMember.contact_id)) return prev;
          return [...prev, newMember];
        });
        setStatusMessage(`Added ${newMember.full_name || newMember.email || newMember.contact_id} to the care list.`);
        setPendingPickerId('');
        setPickerOpen(false);
        if (config) {
          setConfig({ ...config, care_list_size: (config.care_list_size ?? 0) + 1 });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [sessionToken, tenantRef, config],
  );

  const removeMember = useCallback(
    async (contactId: string) => {
      if (!contactId) return;
      const member = members.find((m) => m.contact_id === contactId);
      const label = member?.full_name || member?.email || contactId.slice(0, 8);
      if (!confirm(`Remove ${label} from the care list? They will no longer receive monthly schedule reminders.`)) {
        return;
      }
      setBusy(true);
      setError(null);
      setStatusMessage(null);
      try {
        await apiV1.tenantCareListRemove(contactId, { tenantRef }, sessionToken);
        setMembers((prev) => prev.filter((m) => m.contact_id !== contactId));
        setStatusMessage(`Removed ${label} from the care list.`);
        if (config) {
          setConfig({ ...config, care_list_size: Math.max(0, (config.care_list_size ?? 1) - 1) });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [members, sessionToken, tenantRef, config],
  );

  const toggleEnabled = useCallback(
    async (next: boolean) => {
      setBusy(true);
      setError(null);
      setStatusMessage(null);
      try {
        const res = await apiV1.tenantMonthlyReminderConfigPut(next, { tenantRef }, sessionToken);
        if (res.status !== 'ok') throw new Error('Update failed.');
        setConfig(res.data);
        setStatusMessage(next ? 'Monthly reminder enabled.' : 'Monthly reminder disabled.');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [sessionToken, tenantRef],
  );

  const dispatchPreview = useCallback(async () => {
    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await apiV1.tenantMonthlyReminderDispatch(
        { dry_run: true, force: false, care_list_only: true, month: nextMonthYyyyMm() },
        { tenantRef },
        sessionToken,
      );
      if (res.status !== 'ok') throw new Error('Dry-run failed.');
      setDispatchSummary(res.data);
      setStatusMessage(
        `Dry-run complete: ${res.data.eligible} eligible care-list parents for ${nextMonthLabel()}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [sessionToken, tenantRef]);

  const dispatchLive = useCallback(async () => {
    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await apiV1.tenantMonthlyReminderDispatch(
        { dry_run: false, force: false, care_list_only: true, month: nextMonthYyyyMm() },
        { tenantRef },
        sessionToken,
      );
      if (res.status !== 'ok') throw new Error('Dispatch failed.');
      setDispatchSummary(res.data);
      const summary = res.data;
      if (summary.skipped_disabled) {
        setStatusMessage('Dispatch skipped — toggle is OFF. Enable monthly reminders first.');
      } else if (summary.skipped_idempotent) {
        setStatusMessage('Dispatch skipped — already ran in the past 24 hours.');
      } else {
        setStatusMessage(
          `Live dispatch: ${summary.sent} sent, ${summary.skipped} skipped, ${summary.failed} failed.`,
        );
      }
      const reload = await apiV1.tenantMonthlyReminderConfigGet({ tenantRef }, sessionToken);
      if (reload.status === 'ok') setConfig(reload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setConfirmSendOpen(false);
    }
  }, [sessionToken, tenantRef]);

  if (!sessionToken) {
    return (
      <section className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Customer care</h2>
        <p className="text-sm text-slate-500">Sign in to manage your customer care list.</p>
      </section>
    );
  }

  const enabled = config?.enabled ?? false;
  const careListSize = config?.care_list_size ?? members.length;
  const lastRunAt = config?.last_run_at ?? null;

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Customer care</h2>
        <p className="text-sm text-slate-500">
          Opt-in monthly schedule reminders. Default: nothing dispatches until you enable the toggle and
          add specific parents to the care list.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {statusMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Monthly reminder</div>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`inline-flex h-6 w-12 items-center rounded-full p-0.5 transition ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
              role="switch"
              aria-checked={enabled}
              tabIndex={0}
              onClick={() => !busy && toggleEnabled(!enabled)}
              onKeyDown={(e) => {
                if ((e.key === ' ' || e.key === 'Enter') && !busy) {
                  e.preventDefault();
                  toggleEnabled(!enabled);
                }
              }}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </span>
            <span className="text-sm font-medium">{enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Master switch. When OFF, the dispatch endpoint and any future scheduler will refuse to send.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Care list size</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{careListSize}</div>
          <p className="mt-2 text-xs text-slate-500">
            Only parents on the care list receive reminders. Add or remove from the table below.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Last dispatch</div>
          <div className="mt-2 text-sm font-medium">{formatTimestamp(lastRunAt)}</div>
          <p className="mt-2 text-xs text-slate-500">
            24-hour idempotency: re-running in the next 24h is a no-op unless you pass the force flag.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h3 className="text-base font-semibold">Care list members</h3>
            <p className="text-xs text-slate-500">{filteredMembers.length} of {members.length} shown</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              placeholder="Search name, email, region…"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => setPickerOpen(true)}
              disabled={busy}
            >
              Add member
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading care list…</div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            {members.length === 0
              ? 'No care-list members yet. Click "Add member" to opt a parent in.'
              : 'No matches.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">Region</th>
                  <th className="px-4 py-2">Added</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m) => (
                  <tr key={m.contact_id}>
                    <td className="px-4 py-2 font-medium">{m.full_name || '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{m.email || '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{m.phone || '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{m.region || '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{formatTimestamp(m.added_at)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        className="text-xs text-rose-600 hover:underline disabled:opacity-50"
                        onClick={() => removeMember(m.contact_id)}
                        disabled={busy}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-semibold">Send {nextMonthLabel()} schedule</h3>
        <p className="mt-1 text-xs text-slate-500">
          Sends a personalised bilingual EN/VI email to every care-list parent with at least one upcoming
          session in {nextMonthLabel()}. Run a dry-run first to check the eligible count, then dispatch live.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            onClick={dispatchPreview}
            disabled={busy || !enabled || careListSize === 0}
          >
            Dry-run preview
          </button>
          <button
            type="button"
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => setConfirmSendOpen(true)}
            disabled={busy || !enabled || careListSize === 0}
          >
            Send live
          </button>
          {!enabled ? (
            <span className="text-xs text-amber-600">Enable the toggle above to dispatch.</span>
          ) : null}
          {careListSize === 0 ? (
            <span className="text-xs text-amber-600">Add at least one care-list member.</span>
          ) : null}
        </div>

        {dispatchSummary ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="font-medium">Last run summary</div>
            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
              <div>Eligible: <span className="font-semibold">{dispatchSummary.eligible}</span></div>
              <div>Sent: <span className="font-semibold">{dispatchSummary.sent}</span></div>
              <div>Skipped: <span className="font-semibold">{dispatchSummary.skipped}</span></div>
              <div>Failed: <span className="font-semibold">{dispatchSummary.failed}</span></div>
              <div>Dry-run: <span className="font-semibold">{dispatchSummary.dry_run_count}</span></div>
              <div>Idempotent skip: <span className="font-semibold">{dispatchSummary.skipped_idempotent ? 'yes' : 'no'}</span></div>
              <div>Disabled skip: <span className="font-semibold">{dispatchSummary.skipped_disabled ? 'yes' : 'no'}</span></div>
              <div>Last run: <span className="font-semibold">{formatTimestamp(dispatchSummary.last_run_at)}</span></div>
            </div>
            {dispatchSummary.warnings && dispatchSummary.warnings.length > 0 ? (
              <div className="mt-2 text-amber-700">
                Warnings: {dispatchSummary.warnings.join('; ')}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {pickerOpen ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h4 className="text-base font-semibold">Add a parent to the care list</h4>
            <p className="mt-1 text-xs text-slate-500">
              Pick a contact. They will start receiving the monthly schedule email when the toggle is on.
            </p>
            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">Contact</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={pendingPickerId}
                onChange={(e) => setPendingPickerId(e.target.value)}
              >
                <option value="">Select…</option>
                {candidateStudents.map((s) => (
                  <option key={s.contact_id} value={s.contact_id}>
                    {s.full_name || s.email || s.contact_id} {s.email ? `· ${s.email}` : ''}
                  </option>
                ))}
              </select>
              {candidateStudents.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  All known students are already in the care list (or the student roster hasn't loaded).
                </p>
              ) : null}
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">…or paste a contact_id</label>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs"
                placeholder="e.g. 6c1f…"
                value={pendingPickerId}
                onChange={(e) => setPendingPickerId(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                onClick={() => {
                  setPickerOpen(false);
                  setPendingPickerId('');
                }}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                onClick={() => addMember(pendingPickerId)}
                disabled={busy || !pendingPickerId.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmSendOpen ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h4 className="text-base font-semibold">Send {nextMonthLabel()} schedule live?</h4>
            <p className="mt-2 text-sm text-slate-600">
              {careListSize} parent{careListSize === 1 ? '' : 's'} will receive a personalised email summarising
              their student's upcoming sessions. This action is rate-limited to once per 24 hours.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                onClick={() => setConfirmSendOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                onClick={dispatchLive}
                disabled={busy}
              >
                Send now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
