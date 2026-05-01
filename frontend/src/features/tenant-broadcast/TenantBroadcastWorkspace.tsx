import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { apiV1 } from '../../shared/api';
import type {
  TenantAuthSessionResponse,
  TenantStudentItem,
} from '../../shared/contracts';
import type {
  TenantBroadcastAudienceSampleContact,
  TenantBroadcastAudienceType,
  TenantBroadcastChannel,
  TenantBroadcastChannelSummary,
  TenantBroadcastLocale,
} from '../../shared/api/v1';

type StoredTenantSession = TenantAuthSessionResponse;

type RecentBroadcastEntry = {
  id: string;
  audience_type: TenantBroadcastAudienceType;
  audience_region?: string | null;
  audience_count: number;
  channels: TenantBroadcastChannel[];
  subject?: string | null;
  body_preview: string;
  dispatched_at: string;
  dispatch_summary: Partial<Record<TenantBroadcastChannel, TenantBroadcastChannelSummary>>;
};

interface TenantBroadcastWorkspaceProps {
  session: StoredTenantSession | null;
  /** Optional roster from the parent so we can power the student-search picker
   * without round-tripping students again. May be null while it loads. */
  students?: TenantStudentItem[] | null;
}

const ALL_CHANNELS: TenantBroadcastChannel[] = ['email', 'whatsapp', 'telegram'];

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

function describeAudience(entry: RecentBroadcastEntry): string {
  if (entry.audience_type === 'all') return 'Everyone';
  if (entry.audience_type === 'region') {
    const label = (entry.audience_region || '').trim() || 'Unknown';
    return `Region: ${label}`;
  }
  return 'Single student';
}

function summariseDispatch(
  summary: Partial<Record<TenantBroadcastChannel, TenantBroadcastChannelSummary>>,
): string {
  const parts: string[] = [];
  for (const channel of ALL_CHANNELS) {
    const counts = summary[channel];
    if (!counts) continue;
    parts.push(
      `${channel}: ${counts.sent} sent / ${counts.skipped} skipped / ${counts.failed} failed`,
    );
  }
  return parts.length ? parts.join(' · ') : 'No channels dispatched.';
}

function bodyToMarkdownPreview(body: string): string {
  const trimmed = (body || '').trim();
  if (!trimmed) return 'Type a message body to see the preview.';
  return trimmed;
}

export function TenantBroadcastWorkspace({
  session,
  students = null,
}: TenantBroadcastWorkspaceProps) {
  const sessionToken = session?.session_token ?? null;
  const tenantRef = session?.tenant?.slug ?? null;
  const tenantBrandName = session?.tenant?.name ?? 'BookedAI';

  const [audienceType, setAudienceType] = useState<TenantBroadcastAudienceType>('all');
  const [region, setRegion] = useState<string>('');
  const [studentContactId, setStudentContactId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');

  const [channelEmail, setChannelEmail] = useState<boolean>(true);
  const [channelWhatsapp, setChannelWhatsapp] = useState<boolean>(false);
  const [channelTelegram, setChannelTelegram] = useState<boolean>(false);

  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [locale, setLocale] = useState<TenantBroadcastLocale>('en');

  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [sampleContacts, setSampleContacts] = useState<TenantBroadcastAudienceSampleContact[]>([]);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);

  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<string | null>(null);

  const [recentBroadcasts, setRecentBroadcasts] = useState<RecentBroadcastEntry[]>([]);

  const channels = useMemo<TenantBroadcastChannel[]>(() => {
    const next: TenantBroadcastChannel[] = [];
    if (channelEmail) next.push('email');
    if (channelWhatsapp) next.push('whatsapp');
    if (channelTelegram) next.push('telegram');
    return next;
  }, [channelEmail, channelWhatsapp, channelTelegram]);

  const filteredStudents = useMemo(() => {
    const roster = students ?? [];
    const needle = studentSearch.trim().toLowerCase();
    if (!needle) return roster.slice(0, 8);
    return roster
      .filter((student) => {
        const name = (student.full_name || '').toLowerCase();
        const email = (student.email || '').toLowerCase();
        return name.includes(needle) || email.includes(needle);
      })
      .slice(0, 8);
  }, [students, studentSearch]);

  const refreshPreview = useCallback(async () => {
    if (!sessionToken) {
      setPreviewError('Sign in with an active tenant account before previewing.');
      return;
    }
    if (audienceType === 'region' && !region.trim()) {
      setAudienceCount(null);
      setSampleContacts([]);
      setPreviewError('Choose a region to preview the audience.');
      return;
    }
    if (audienceType === 'student' && !studentContactId.trim()) {
      setAudienceCount(null);
      setSampleContacts([]);
      setPreviewError('Pick a student to preview the audience.');
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const env = await apiV1.tenantBroadcastAudiencePreview(
        {
          audienceType,
          region: audienceType === 'region' ? region.trim() : null,
          studentContactId: audienceType === 'student' ? studentContactId.trim() : null,
          tenantRef,
        },
        sessionToken,
      );
      if (env.status !== 'ok') {
        setPreviewError('Audience preview failed.');
        setAudienceCount(null);
        setSampleContacts([]);
        return;
      }
      const data = env.data;
      setAudienceCount(data.audience_count);
      setSampleContacts(data.sample_contacts || []);
      setAvailableRegions(data.available_regions || []);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Audience preview failed.');
      setAudienceCount(null);
      setSampleContacts([]);
    } finally {
      setPreviewLoading(false);
    }
  }, [audienceType, region, studentContactId, sessionToken, tenantRef]);

  // Bootstrap region list + initial audience preview on first mount.
  useEffect(() => {
    if (!sessionToken) return;
    void refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  const audienceLabel = (() => {
    if (audienceType === 'all') return 'Everyone with active enrolments';
    if (audienceType === 'region') return `Region: ${region.trim() || '—'}`;
    if (audienceType === 'student') {
      const match = (students ?? []).find((item) => item.contact_id === studentContactId);
      return `Single student: ${match?.full_name || studentContactId || '—'}`;
    }
    return '—';
  })();

  function resetSendStatus() {
    setSendError(null);
    setSendMessage(null);
  }

  function handleAudienceTypeChange(next: TenantBroadcastAudienceType) {
    setAudienceType(next);
    setAudienceCount(null);
    setSampleContacts([]);
    resetSendStatus();
  }

  async function handlePreviewClick(event: FormEvent<HTMLButtonElement>) {
    event.preventDefault();
    await refreshPreview();
  }

  async function handleSendBroadcast() {
    if (!sessionToken) {
      setSendError('Sign in with an active tenant account before sending.');
      return;
    }
    if (channels.length === 0) {
      setSendError('Choose at least one channel before sending.');
      return;
    }
    if (!body.trim()) {
      setSendError('Add a message body before sending.');
      return;
    }
    setSubmitting(true);
    resetSendStatus();
    try {
      const env = await apiV1.tenantBroadcastSend(
        {
          audience: {
            type: audienceType,
            region: audienceType === 'region' ? region.trim() : null,
            student_contact_id: audienceType === 'student' ? studentContactId.trim() : null,
          },
          channels,
          subject: subject.trim() || null,
          body: body.trim(),
          locale,
        },
        { tenantRef },
        sessionToken,
      );
      if (env.status !== 'ok') {
        setSendError('Broadcast dispatch failed.');
        setShowConfirm(false);
        return;
      }
      const data = env.data;
      setSendMessage(`Broadcast sent to ${data.audience_count} recipients.`);
      setShowConfirm(false);
      setRecentBroadcasts((current) => {
        const next: RecentBroadcastEntry = {
          id: data.broadcast_id,
          audience_type: audienceType,
          audience_region: audienceType === 'region' ? region.trim() : null,
          audience_count: data.audience_count,
          channels,
          subject: subject.trim() || null,
          body_preview: body.trim().slice(0, 200),
          dispatched_at: new Date().toISOString(),
          dispatch_summary: data.dispatch_summary,
        };
        return [next, ...current].slice(0, 5);
      });
      setBody('');
      setSubject('');
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Broadcast dispatch failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const subjectVisible = channels.includes('email');
  const previewMarkdown = bodyToMarkdownPreview(body);

  return (
    <section className="grid gap-6">
      <article
        id="tenant-broadcast-overview"
        className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Broadcast
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Send a notification to your parents
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Send a holiday closure, schedule change, or per-student note across email,
              WhatsApp, or Telegram. Each broadcast is throttled to one per hour and
              audited so the BookedAI team can replay it if any channel needs to be
              redelivered. Broadcasting from {tenantBrandName}.
            </p>
          </div>
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <div className="font-semibold text-slate-700">Rate limit</div>
            <div className="mt-1 leading-5">1 broadcast per tenant per hour.</div>
          </div>
        </div>
      </article>

      <article
        id="tenant-broadcast-audience"
        className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Audience
        </div>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
          Who should receive this broadcast?
        </h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(['all', 'region', 'student'] as TenantBroadcastAudienceType[]).map((option) => {
            const active = option === audienceType;
            const title =
              option === 'all'
                ? 'Everyone with active enrolments'
                : option === 'region'
                ? 'By region'
                : 'Single student';
            const subtitle =
              option === 'all'
                ? 'Every parent who has booked at least one class.'
                : option === 'region'
                ? 'Filter by the region tag set on the contact.'
                : 'Send a per-student message to one parent.';
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleAudienceTypeChange(option)}
                className={`template-card text-left transition ${
                  active
                    ? 'border-slate-950 bg-slate-50 ring-2 ring-slate-950/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-semibold text-slate-950">{title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</div>
              </button>
            );
          })}
        </div>

        {audienceType === 'region' ? (
          <label className="mt-4 block text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Region
            </span>
            <div className="mt-2 flex gap-2">
              <input
                list="tenant-broadcast-region-options"
                type="text"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                placeholder="e.g. HCMC, Hanoi, Sydney, International"
                className="w-full rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-slate-500 focus:outline-none"
              />
              <datalist id="tenant-broadcast-region-options">
                {availableRegions.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </div>
            <span className="mt-1 block text-[11px] text-slate-500">
              Contacts without a region are grouped as "Unknown".
            </span>
          </label>
        ) : null}

        {audienceType === 'student' ? (
          <div className="mt-4 grid gap-2">
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Search students
              </span>
              <input
                type="search"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search by name or email"
                className="mt-2 w-full rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </label>
            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-2">
              {filteredStudents.length === 0 ? (
                <div className="px-3 py-4 text-xs text-slate-500">
                  No students match this search.
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {filteredStudents.map((student) => {
                    const active = student.contact_id === studentContactId;
                    return (
                      <li key={student.contact_id}>
                        <button
                          type="button"
                          onClick={() => setStudentContactId(student.contact_id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-[0.75rem] px-3 py-2 text-left text-sm transition ${
                            active
                              ? 'bg-slate-950 text-white'
                              : 'text-slate-700 hover:bg-white'
                          }`}
                        >
                          <span className="truncate">
                            <span className="font-semibold">
                              {student.full_name || 'Unnamed'}
                            </span>
                            <span className={`ml-2 text-xs ${active ? 'text-white/70' : 'text-slate-500'}`}>
                              {student.email || 'no email'}
                            </span>
                          </span>
                          <span className={`text-[11px] ${active ? 'text-white/80' : 'text-slate-400'}`}>
                            {active ? 'selected' : 'select'}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={(event) => {
              void handlePreviewClick(event);
            }}
            disabled={previewLoading}
            className="booked-button disabled:cursor-not-allowed disabled:opacity-60"
          >
            {previewLoading ? 'Loading preview...' : 'Preview audience'}
          </button>
          {audienceCount !== null ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {audienceCount} {audienceCount === 1 ? 'recipient' : 'recipients'}
            </span>
          ) : null}
        </div>

        {previewError ? (
          <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {previewError}
          </div>
        ) : null}

        {sampleContacts.length > 0 ? (
          <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Sample (5 of {audienceCount})
            </div>
            <ul className="mt-2 space-y-1.5">
              {sampleContacts.map((sample, index) => (
                <li
                  key={`${sample.name}-${index}`}
                  className="flex flex-wrap items-center gap-2 text-xs text-slate-600"
                >
                  <span className="font-semibold text-slate-800">{sample.name}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500">
                    {sample.region}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      sample.email_present
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    email {sample.email_present ? 'on' : 'off'}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      sample.phone_present
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    phone {sample.phone_present ? 'on' : 'off'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>

      <article
        id="tenant-broadcast-composer"
        className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Channels & message
        </div>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
          Compose your broadcast
        </h3>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={channelEmail}
              onChange={(event) => setChannelEmail(event.target.checked)}
            />
            <span>Email</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={channelWhatsapp}
              onChange={(event) => setChannelWhatsapp(event.target.checked)}
            />
            <span>WhatsApp</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={channelTelegram}
              onChange={(event) => setChannelTelegram(event.target.checked)}
            />
            <span>Telegram</span>
          </label>
          <span className="text-xs text-slate-500">
            Contacts without a channel address are skipped automatically.
          </span>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            {subjectVisible ? (
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Subject (email only)
                </span>
                <input
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="e.g. Schedule update for next week"
                  className="mt-2 w-full rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-slate-500 focus:outline-none"
                />
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Body
              </span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={10}
                placeholder={'Hi parents,\n\nA quick note about next week...\n\nThank you!'}
                className="mt-2 w-full rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-slate-500 focus:outline-none"
              />
              <span className="mt-1 block text-[11px] text-slate-500">
                Markdown supported: **bold**, _italic_, [link](https://example.com).
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Locale
              </span>
              {(['en', 'vi'] as TenantBroadcastLocale[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLocale(option)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    locale === option
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Live preview
            </div>
            {subjectVisible && subject.trim() ? (
              <div className="mt-2 text-base font-semibold text-slate-900">
                {subject.trim()}
              </div>
            ) : null}
            <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">
              {previewMarkdown}
            </pre>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Preview per-channel render
          </button>
          <button
            type="button"
            disabled={
              submitting ||
              channels.length === 0 ||
              !body.trim() ||
              audienceCount === null ||
              audienceCount === 0
            }
            onClick={() => setShowConfirm(true)}
            className="booked-button disabled:cursor-not-allowed disabled:opacity-60"
          >
            {audienceCount === null
              ? 'Send broadcast'
              : `Send broadcast to ${audienceCount} ${audienceCount === 1 ? 'recipient' : 'recipients'}`}
          </button>
        </div>

        {sendError ? (
          <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {sendError}
          </div>
        ) : null}
        {sendMessage ? (
          <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {sendMessage}
          </div>
        ) : null}
      </article>

      <article
        id="tenant-broadcast-recent"
        className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Recent broadcasts
        </div>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
          Last 5 broadcasts from this session
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          A persistent audit log of every broadcast also lives in
          BookedAI's outbox event store under
          <code className="mx-1 rounded bg-slate-100 px-1 text-[11px]">tenant.broadcast.dispatched</code>
          and is replayable from the admin console.
        </p>
        <div className="mt-4 space-y-3">
          {recentBroadcasts.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No broadcasts have been sent in this session yet.
            </div>
          ) : (
            recentBroadcasts.map((entry) => (
              <article
                key={entry.id}
                className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{formatTimestamp(entry.dispatched_at)}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                    {describeAudience(entry)}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                    {entry.audience_count} recipients
                  </span>
                </div>
                {entry.subject ? (
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {entry.subject}
                  </div>
                ) : null}
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {entry.body_preview}
                </p>
                <div className="mt-2 text-[11px] uppercase tracking-[0.1em] text-slate-500">
                  {summariseDispatch(entry.dispatch_summary)}
                </div>
              </article>
            ))
          )}
        </div>
      </article>

      {showPreviewModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Per-channel preview
                </div>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">
                  How each channel will render
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {channelEmail ? (
                <section className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Email
                  </div>
                  {subject.trim() ? (
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {subject.trim()}
                    </div>
                  ) : null}
                  <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">
                    {previewMarkdown}
                  </pre>
                </section>
              ) : null}
              {channelWhatsapp ? (
                <section className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    WhatsApp
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">
                    {(subject.trim() ? `${subject.trim()}\n\n` : '') + previewMarkdown}
                  </pre>
                </section>
              ) : null}
              {channelTelegram ? (
                <section className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Telegram
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">
                    {(subject.trim() ? `${subject.trim()}\n\n` : '') + previewMarkdown}
                  </pre>
                </section>
              ) : null}
              {channels.length === 0 ? (
                <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Pick at least one channel to see how it will render.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-lg rounded-[1.5rem] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Confirm broadcast
            </div>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              Send to {audienceCount ?? 0} {audienceCount === 1 ? 'recipient' : 'recipients'}?
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>
                <span className="font-semibold">Audience:</span> {audienceLabel}
              </li>
              <li>
                <span className="font-semibold">Channels:</span>{' '}
                {channels.length ? channels.join(', ') : 'none selected'}
              </li>
              <li>
                <span className="font-semibold">Locale:</span> {locale.toUpperCase()}
              </li>
              <li>
                <span className="font-semibold">Subject:</span> {subject.trim() || '—'}
              </li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              The broadcast will be rate-limited to once per hour for this tenant. After
              sending, the audit row is queued in
              <code className="mx-1 rounded bg-slate-100 px-1 text-[11px]">tenant.broadcast.dispatched</code>.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSendBroadcast();
                }}
                disabled={submitting}
                className="booked-button disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Sending...' : 'Send broadcast'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
