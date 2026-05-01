import { useMemo, useState } from 'react';

import type { StudentProgressEntry } from '../../shared/api/v1';

/**
 * Strings consumed by the student portal section components. The dictionary
 * is owned by the host app (StudentPortalApp) so that the sign-in screen and
 * these expanded sections share one source of bilingual copy.
 */
export interface StudentPortalCopy {
  heroSessionsLabel: string;
  heroSessionsValueSuffix: string;
  heroSessionsEmpty: string;
  heroLevelLabel: string;
  heroLevelEmpty: string;
  heroNextFocusLabel: string;
  heroNextFocusEmpty: string;
  nextFocusKicker: string;
  nextFocusHeading: string;
  nextFocusEmpty: string;
  evalsHeading: string;
  evalsLead: string;
  evalsReadMore: string;
  evalsReadLess: string;
  evalsEmpty: string;
  timelineHeading: string;
  timelineLead: string;
  timelineCurrentLevel: string;
  fullProgressHeading: string;
  fullProgressLead: string;
  fullProgressShow: string;
  fullProgressHide: string;
  progressDate: string;
  progressLevel: string;
  progressAttendance: string;
  progressNextFocus: string;
}

const NOTE_PREVIEW_CHARS = 200;

function parseAttendance(value: string | undefined | null): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const match = String(value).match(/-?\d+/);
  if (!match) return 0;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function truncate(text: string, max: number): { preview: string; truncated: boolean } {
  const trimmed = (text || '').trim();
  if (trimmed.length <= max) return { preview: trimmed, truncated: false };
  return { preview: `${trimmed.slice(0, max).trimEnd()}…`, truncated: true };
}

/**
 * Hero stat row with three at-a-glance cards: total sessions attended, current
 * level (most recent progress entry), and next focus (truncated). Renders as a
 * 3-up grid on desktop and stacks on mobile via Tailwind's `sm:grid-cols-3`.
 */
export function StudentHeroStats({
  progress,
  copy,
}: {
  progress: StudentProgressEntry[];
  copy: StudentPortalCopy;
}) {
  const totalAttendance = useMemo(
    () => progress.reduce((sum, entry) => sum + parseAttendance(entry.attendance), 0),
    [progress],
  );
  const latest = progress[0];
  const currentLevel = (latest?.level || '').trim();
  const nextFocus = (latest?.next_focus || '').trim();
  const nextFocusPreview = nextFocus ? truncate(nextFocus, 90).preview : '';

  return (
    <section
      aria-label={copy.heroSessionsLabel}
      className="grid gap-3 sm:grid-cols-3"
    >
      <article className="template-card flex flex-col gap-2 p-5">
        <span className="template-kicker">{copy.heroSessionsLabel}</span>
        <div className="text-3xl font-semibold tracking-[-0.02em] text-apple-near-black">
          {totalAttendance > 0 ? totalAttendance : copy.heroSessionsEmpty}
        </div>
        {totalAttendance > 0 ? (
          <span className="text-xs text-black/56">{copy.heroSessionsValueSuffix}</span>
        ) : null}
        <div
          aria-hidden="true"
          className="mt-2 h-1.5 w-full overflow-hidden rounded-apple-pill bg-apple-light"
        >
          <div
            className="h-full rounded-apple-pill"
            style={{
              width: `${Math.min(100, totalAttendance * 12)}%`,
              background:
                'linear-gradient(90deg, rgba(212, 175, 55, 0.95), rgba(212, 175, 55, 0.55))',
            }}
          />
        </div>
      </article>

      <article className="template-card flex flex-col gap-2 p-5">
        <span className="template-kicker">{copy.heroLevelLabel}</span>
        <div className="text-2xl font-semibold tracking-[-0.02em] text-apple-near-black">
          {currentLevel || copy.heroLevelEmpty}
        </div>
        {latest?.session_date ? (
          <span className="text-xs text-black/56">{latest.session_date}</span>
        ) : null}
      </article>

      <article
        className="flex flex-col gap-2 rounded-apple-large border p-5 text-apple-white shadow-apple-sm"
        style={{
          background: 'linear-gradient(135deg, #0f1f3d 0%, #19305c 100%)',
          borderColor: 'rgba(212, 175, 55, 0.55)',
        }}
      >
        <span
          className="template-kicker"
          style={{ color: 'rgba(212, 175, 55, 0.9)' }}
        >
          {copy.heroNextFocusLabel}
        </span>
        <div className="text-base font-semibold leading-6 text-apple-white">
          {nextFocusPreview || copy.heroNextFocusEmpty}
        </div>
      </article>
    </section>
  );
}

/**
 * Headline "What's next" card. Surfaces the most recent `next_focus` text in a
 * gold-bordered, navy-backgrounded card. Falls back to a friendly empty state
 * if the latest progress entry has no `next_focus`.
 */
export function StudentNextFocusCard({
  progress,
  copy,
}: {
  progress: StudentProgressEntry[];
  copy: StudentPortalCopy;
}) {
  const latest = progress[0];
  const text = (latest?.next_focus || '').trim();
  const hasText = Boolean(text);
  return (
    <section
      aria-labelledby="student-next-focus-heading"
      className="rounded-apple-large border p-6 text-apple-white shadow-apple-sm sm:p-8"
      style={{
        background: 'linear-gradient(135deg, #0f1f3d 0%, #1d3a72 100%)',
        borderColor: 'rgba(212, 175, 55, 0.6)',
      }}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-apple-standard"
          style={{
            background: 'rgba(212, 175, 55, 0.2)',
            border: '1px solid rgba(212, 175, 55, 0.55)',
            color: '#f3d774',
          }}
        >
          →
        </span>
        <div className="flex-1">
          <span
            className="template-kicker"
            style={{ color: 'rgba(212, 175, 55, 0.9)' }}
          >
            {copy.nextFocusKicker}
          </span>
          <h2
            id="student-next-focus-heading"
            className="mt-2 text-xl font-semibold tracking-[-0.02em] text-apple-white sm:text-2xl"
          >
            {copy.nextFocusHeading}
          </h2>
          <p className="mt-3 text-sm leading-7 text-apple-white/82 sm:text-base">
            {hasText ? text : copy.nextFocusEmpty}
          </p>
          {hasText && latest?.session_date ? (
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-apple-white/56">
              {latest.session_date}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * Latest evaluations: the most recent three coach `notes` entries. Each card
 * truncates to ~200 chars with an inline "Read more" toggle that reveals the
 * full text without leaving the page (no modal — keeps the chunk small).
 */
export function StudentLatestEvaluations({
  progress,
  copy,
}: {
  progress: StudentProgressEntry[];
  copy: StudentPortalCopy;
}) {
  const top = useMemo(
    () => progress.filter((entry) => (entry.notes || '').trim().length > 0).slice(0, 3),
    [progress],
  );
  if (!top.length) {
    return null;
  }
  return (
    <section aria-labelledby="student-evals-heading">
      <header className="mb-3">
        <span className="template-kicker" id="student-evals-heading">
          {copy.evalsHeading}
        </span>
        <p className="mt-2 text-sm text-black/64">{copy.evalsLead}</p>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        {top.map((entry, index) => (
          <EvaluationCard
            key={`${entry.session_date}-${index}`}
            entry={entry}
            readMoreLabel={copy.evalsReadMore}
            readLessLabel={copy.evalsReadLess}
            levelLabel={copy.progressLevel}
          />
        ))}
      </div>
    </section>
  );
}

function EvaluationCard({
  entry,
  readMoreLabel,
  readLessLabel,
  levelLabel,
}: {
  entry: StudentProgressEntry;
  readMoreLabel: string;
  readLessLabel: string;
  levelLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const notes = (entry.notes || '').trim();
  const { preview, truncated } = truncate(notes, NOTE_PREVIEW_CHARS);
  const text = expanded || !truncated ? notes : preview;
  return (
    <article className="template-card flex flex-col gap-2 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-apple-blue">
          {entry.session_date || '—'}
        </span>
        {entry.level ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56">
            {levelLabel}: {entry.level}
          </span>
        ) : null}
      </div>
      <p className="text-sm leading-7 text-apple-near-black">{text}</p>
      {truncated ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="self-start text-xs font-semibold text-apple-blue underline-offset-2 hover:underline"
        >
          {expanded ? readLessLabel : readMoreLabel}
        </button>
      ) : null}
    </article>
  );
}

/**
 * Level progression timeline. Renders as a horizontal stepper on `sm+` and
 * as a vertical card list on mobile. Levels are deduped to the first time
 * they appear (chronologically) so we don't show the same level pill twice
 * if the coach logged it across consecutive sessions.
 */
export function StudentLevelTimeline({
  progress,
  copy,
}: {
  progress: StudentProgressEntry[];
  copy: StudentPortalCopy;
}) {
  // Build chronological (oldest -> latest) deduped level history.
  const stops = useMemo(() => {
    const chronological = [...progress].reverse();
    const seen = new Set<string>();
    const out: { level: string; date: string; attendance: number }[] = [];
    for (const entry of chronological) {
      const level = (entry.level || '').trim();
      if (!level) continue;
      const key = level.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        level,
        date: entry.session_date || '',
        attendance: parseAttendance(entry.attendance),
      });
    }
    return out;
  }, [progress]);

  if (!stops.length) {
    return null;
  }

  if (stops.length === 1) {
    return (
      <section aria-labelledby="student-timeline-heading">
        <header className="mb-3">
          <span className="template-kicker" id="student-timeline-heading">
            {copy.timelineHeading}
          </span>
          <p className="mt-2 text-sm text-black/64">{copy.timelineLead}</p>
        </header>
        <div className="template-card inline-flex flex-wrap items-center gap-3 p-4">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-black/56">
            {copy.timelineCurrentLevel}
          </span>
          <span className="text-base font-semibold text-apple-near-black">
            {stops[0].level}
          </span>
          {stops[0].date ? (
            <span className="text-xs text-black/52">· {stops[0].date}</span>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="student-timeline-heading">
      <header className="mb-3">
        <span className="template-kicker" id="student-timeline-heading">
          {copy.timelineHeading}
        </span>
        <p className="mt-2 text-sm text-black/64">{copy.timelineLead}</p>
      </header>

      {/* Horizontal stepper — visible on sm+ */}
      <ol className="m-0 hidden list-none items-center gap-0 overflow-x-auto p-0 sm:flex">
        {stops.map((stop, index) => {
          const isLatest = index === stops.length - 1;
          return (
            <li
              key={`${stop.level}-${index}`}
              className="flex shrink-0 items-center gap-0"
            >
              <div
                className="flex flex-col items-center gap-1 rounded-apple-pill border px-4 py-2 text-center"
                style={{
                  borderColor: isLatest ? 'rgba(212,175,55,0.7)' : 'rgba(0,0,0,0.12)',
                  background: isLatest
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))'
                    : '#ffffff',
                  color: isLatest ? '#7a5b08' : '#1d1d1f',
                  minWidth: 140,
                }}
              >
                <span className="text-sm font-semibold leading-tight">{stop.level}</span>
                {stop.date ? (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/52">
                    {stop.date}
                  </span>
                ) : null}
              </div>
              {index < stops.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="mx-2 inline-block h-0.5 w-10"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(212,175,55,0.7), rgba(212,175,55,0.2))',
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Vertical cards — visible on mobile only */}
      <ol className="m-0 flex list-none flex-col gap-2 p-0 sm:hidden">
        {[...stops].reverse().map((stop, index, arr) => {
          const isLatest = index === 0;
          return (
            <li
              key={`${stop.level}-mobile-${index}`}
              className="flex items-baseline gap-3 rounded-apple-large border bg-apple-white p-4 shadow-apple-sm"
              style={{
                borderColor: isLatest ? 'rgba(212,175,55,0.55)' : 'rgba(0,0,0,0.08)',
              }}
            >
              <span
                aria-hidden="true"
                className="text-xs font-semibold uppercase tracking-[0.16em]"
                style={{ color: isLatest ? '#7a5b08' : '#1d1d1f99' }}
              >
                {arr.length - index}.
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-apple-near-black">
                  {stop.level}
                </div>
                {stop.date ? (
                  <div className="text-xs text-black/56">{stop.date}</div>
                ) : null}
              </div>
              {stop.attendance > 0 ? (
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/52">
                  {stop.attendance}×
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Full progress timeline (the original ProgressTimeline). Collapsed behind a
 * disclosure button by default so the page leads with the curated highlights
 * but keeps every entry one click away.
 */
export function StudentFullProgressTimeline({
  progress,
  copy,
}: {
  progress: StudentProgressEntry[];
  copy: StudentPortalCopy;
}) {
  const [open, setOpen] = useState(false);
  if (!progress.length) {
    return null;
  }
  return (
    <section aria-labelledby="student-full-progress-heading">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="template-kicker" id="student-full-progress-heading">
            {copy.fullProgressHeading}
          </span>
          <p className="mt-2 text-sm text-black/64">{copy.fullProgressLead}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="booked-button-secondary"
          aria-expanded={open}
        >
          {open ? copy.fullProgressHide : copy.fullProgressShow}
        </button>
      </header>
      {open ? (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {progress.map((entry, index) => (
            <li
              key={`${entry.session_date}-full-${index}`}
              className="rounded-apple-large border border-black/8 bg-apple-white p-5 shadow-apple-sm"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-blue">
                  {copy.progressDate}
                </span>
                <span className="text-base font-semibold text-apple-near-black">
                  {entry.session_date || '—'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-black/64">
                <span>
                  <strong className="text-apple-near-black">{copy.progressLevel}:</strong>{' '}
                  {entry.level || '—'}
                </span>
                <span>
                  <strong className="text-apple-near-black">{copy.progressAttendance}:</strong>{' '}
                  {entry.attendance || '—'}
                </span>
              </div>
              {entry.notes ? (
                <p className="mt-3 text-sm leading-7 text-apple-near-black">{entry.notes}</p>
              ) : null}
              {entry.next_focus ? (
                <div
                  className="mt-3 rounded-apple-standard border px-3 py-2 text-sm"
                  style={{
                    borderColor: 'rgba(212,175,55,0.45)',
                    background: 'rgba(212,175,55,0.08)',
                  }}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a5b08]">
                    {copy.progressNextFocus}
                  </span>
                  <p className="mt-1 leading-6 text-apple-near-black">{entry.next_focus}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

/**
 * Skeleton placeholder while `studentMe` is in flight. Matches the shape of
 * the real layout (hero row + next-focus card + bookings table + evaluation
 * grid) so the swap to real data doesn't shift the page.
 */
export function StudentPortalSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-apple-large bg-apple-light" />
        <div className="h-24 rounded-apple-large bg-apple-light" />
        <div className="h-24 rounded-apple-large bg-apple-light" />
      </div>
      <div className="h-32 rounded-apple-large bg-apple-light" />
      <div className="h-40 rounded-apple-large bg-apple-light" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-32 rounded-apple-large bg-apple-light" />
        <div className="h-32 rounded-apple-large bg-apple-light" />
        <div className="h-32 rounded-apple-large bg-apple-light" />
      </div>
    </div>
  );
}

/**
 * Friendly empty state for when the student has zero progress entries — the
 * coach hasn't logged a session yet. Replaces a bare "no data" message.
 */
export function StudentProgressEmpty({ copy }: { copy: StudentPortalCopy }) {
  return (
    <section className="template-card p-6 text-center sm:p-8">
      <span className="template-kicker">{copy.evalsHeading}</span>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-black/64">
        {copy.evalsEmpty}
      </p>
    </section>
  );
}
