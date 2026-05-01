import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  GraduationCap,
  LogOut,
  MapPin,
  Sparkles,
  Waves,
} from 'lucide-react';

import '../../theme/future-swim-tokens.css';

import { FUTURE_SWIM_CENTRES } from './futureswim/centres';
import { FUTURE_SWIM_LEVELS } from './futureswim/levels';
import type {
  FutureSwimCoachApiResponse,
  FutureSwimCoachEvaluationEntry,
  FutureSwimCoachMePayload,
  FutureSwimCoachProgressEntry,
  FutureSwimCoachStudentSummary,
  FutureSwimCoachSummary,
  FutureSwimCoachLoginVerifyPayload,
} from './futureswim/coach-types';

const SESSION_TOKEN_STORAGE_KEY = 'futureswim.coach.sessionToken';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; payload: FutureSwimCoachMePayload }
  | { kind: 'error'; message: string };

type LoginStage = 'request_email' | 'verify_code' | 'submitting';

type WriteTab = 'progress' | 'evaluation';

type WriteResult =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'progress_ok'; entry: FutureSwimCoachProgressEntry }
  | { kind: 'evaluation_ok'; entry: FutureSwimCoachEvaluationEntry }
  | { kind: 'error'; message: string };

function levelLabel(code: string | null): string {
  if (!code) return '—';
  const found = FUTURE_SWIM_LEVELS.find((level) => level.code === code);
  return found?.name ?? code;
}

function centreLabel(code: string | null): string {
  if (!code) return 'Future Swim';
  const found = FUTURE_SWIM_CENTRES.find((centre) => centre.code === code);
  return found ? `Future Swim ${found.name}` : code;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return new Intl.DateTimeFormat('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(dt);
  } catch {
    return iso;
  }
}

function todayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function ageInYears(iso: string | null): number | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dt.getFullYear();
  const monthDiff = now.getMonth() - dt.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dt.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function readStoredSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistSessionToken(token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  } catch {
    /* localStorage unavailable */
  }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function CoachHeader({
  coach,
  onLogout,
}: {
  coach: FutureSwimCoachSummary;
  onLogout: () => void;
}) {
  const givenName = (coach.full_name || coach.email || 'Coach').split(' ')[0] || 'Coach';
  return (
    <header className="fs-card-feature mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="fs-kicker">Coach dashboard</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--fs-text)] sm:text-4xl">
            Welcome, {givenName}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--fs-text-muted)]">
            Students at your assigned Future Swim centres are listed below. Click any row to
            log a lesson note or record a periodic evaluation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {coach.coach_initials ? (
            <span className="fs-chip" aria-label={`Coach initials ${coach.coach_initials}`}>
              <Sparkles size={12} aria-hidden="true" /> Coach {coach.coach_initials}
            </span>
          ) : null}
          {coach.assigned_centre_codes.map((code) => (
            <span key={code} className="fs-chip">
              <MapPin size={12} aria-hidden="true" /> {centreLabel(code)}
            </span>
          ))}
          <button
            type="button"
            className="fs-button-ghost"
            onClick={onLogout}
            aria-label="Sign out of Future Swim coach dashboard"
          >
            <LogOut size={14} aria-hidden="true" /> Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Inline write panel
// ---------------------------------------------------------------------------

function WritePanel({
  student,
  sessionToken,
  onClose,
}: {
  student: FutureSwimCoachStudentSummary;
  sessionToken: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<WriteTab>('progress');
  const [result, setResult] = useState<WriteResult>({ kind: 'idle' });

  // progress form
  const [pSessionDate, setPSessionDate] = useState<string>(todayIso());
  const [pAttendance, setPAttendance] = useState<string>('1');
  const [pFocusSkill, setPFocusSkill] = useState<string>('');
  const [pNotes, setPNotes] = useState<string>('');

  // evaluation form
  const [eEvaluatedAt, setEEvaluatedAt] = useState<string>(todayIso());
  const [eOutcome, setEOutcome] = useState<string>('progressed');
  const [eStrengths, setEStrengths] = useState<string>('');
  const [eAreas, setEAreas] = useState<string>('');
  const [eNextLevel, setENextLevel] = useState<string>('');
  const [eNextSummary, setENextSummary] = useState<string>('');

  function resetProgressForm() {
    setPSessionDate(todayIso());
    setPAttendance('1');
    setPFocusSkill('');
    setPNotes('');
  }

  function resetEvaluationForm() {
    setEEvaluatedAt(todayIso());
    setEOutcome('progressed');
    setEStrengths('');
    setEAreas('');
    setENextLevel('');
    setENextSummary('');
  }

  async function submitProgress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult({ kind: 'submitting' });
    try {
      const response = await fetch(
        `/api/v1/futureswim/coach/students/${encodeURIComponent(student.id)}/progress`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            session_date: pSessionDate,
            attendance: pAttendance ? Number(pAttendance) : null,
            focus_skill: pFocusSkill || null,
            notes_md: pNotes || null,
          }),
        },
      );
      const json = (await response.json()) as FutureSwimCoachApiResponse<{
        progress_entry: FutureSwimCoachProgressEntry;
      }>;
      if (!response.ok || json.status !== 'ok' || !json.data) {
        const message =
          json.status === 'error'
            ? json.error?.message || json.message || 'Could not save the lesson note.'
            : 'Could not save the lesson note.';
        setResult({ kind: 'error', message });
        return;
      }
      setResult({ kind: 'progress_ok', entry: json.data.progress_entry });
      resetProgressForm();
    } catch (err) {
      setResult({
        kind: 'error',
        message:
          err instanceof Error
            ? `Could not save lesson note: ${err.message}`
            : 'Could not save lesson note. Try again in a moment.',
      });
    }
  }

  async function submitEvaluation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult({ kind: 'submitting' });
    try {
      const response = await fetch(
        `/api/v1/futureswim/coach/students/${encodeURIComponent(student.id)}/evaluation`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            evaluated_at: eEvaluatedAt,
            level_outcome: eOutcome || null,
            strengths_md: eStrengths || null,
            areas_to_work_on_md: eAreas || null,
            next_step_level_code: eNextLevel || null,
            next_step_summary: eNextSummary || null,
          }),
        },
      );
      const json = (await response.json()) as FutureSwimCoachApiResponse<{
        evaluation: FutureSwimCoachEvaluationEntry;
      }>;
      if (!response.ok || json.status !== 'ok' || !json.data) {
        const message =
          json.status === 'error'
            ? json.error?.message || json.message || 'Could not save the evaluation.'
            : 'Could not save the evaluation.';
        setResult({ kind: 'error', message });
        return;
      }
      setResult({ kind: 'evaluation_ok', entry: json.data.evaluation });
      resetEvaluationForm();
    } catch (err) {
      setResult({
        kind: 'error',
        message:
          err instanceof Error
            ? `Could not save evaluation: ${err.message}`
            : 'Could not save evaluation. Try again in a moment.',
      });
    }
  }

  return (
    <div className="fs-coach-write-panel mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`fs-button-ghost ${tab === 'progress' ? 'fs-active' : ''}`}
            onClick={() => {
              setTab('progress');
              setResult({ kind: 'idle' });
            }}
          >
            <ClipboardList size={14} aria-hidden="true" /> Add lesson note
          </button>
          <button
            type="button"
            className={`fs-button-ghost ${tab === 'evaluation' ? 'fs-active' : ''}`}
            onClick={() => {
              setTab('evaluation');
              setResult({ kind: 'idle' });
            }}
          >
            <CheckCircle2 size={14} aria-hidden="true" /> Add evaluation
          </button>
        </div>
        <button type="button" className="fs-button-ghost" onClick={onClose} aria-label="Collapse write panel">
          <ChevronUp size={14} aria-hidden="true" /> Collapse
        </button>
      </div>

      {tab === 'progress' ? (
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitProgress} aria-label="Lesson note form">
          <label className="grid gap-1 text-sm">
            <span className="text-[color:var(--fs-text-muted)]">Session date</span>
            <input
              className="fs-input"
              type="date"
              value={pSessionDate}
              onChange={(event) => setPSessionDate(event.target.value)}
              required
              aria-label="Session date"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-[color:var(--fs-text-muted)]">Attendance</span>
            <select
              className="fs-select"
              value={pAttendance}
              onChange={(event) => setPAttendance(event.target.value)}
              aria-label="Attendance"
            >
              <option value="1">Present</option>
              <option value="2">Present (late)</option>
              <option value="0">Absent</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-[color:var(--fs-text-muted)]">Focus skill (optional)</span>
            <input
              className="fs-input"
              type="text"
              maxLength={120}
              placeholder="e.g. Front floats with kick"
              value={pFocusSkill}
              onChange={(event) => setPFocusSkill(event.target.value)}
              aria-label="Focus skill"
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-[color:var(--fs-text-muted)]">Lesson notes (markdown ok)</span>
            <textarea
              className="fs-textarea"
              rows={4}
              placeholder="What did the child work on today? Wins, sticking points, what comes next..."
              value={pNotes}
              onChange={(event) => setPNotes(event.target.value)}
              aria-label="Lesson notes"
            />
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="fs-button" disabled={result.kind === 'submitting'}>
              {result.kind === 'submitting' ? 'Saving…' : 'Save lesson note'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </form>
      ) : (
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitEvaluation} aria-label="Evaluation form">
          <label className="grid gap-1 text-sm">
            <span className="text-[color:var(--fs-text-muted)]">Evaluated on</span>
            <input
              className="fs-input"
              type="date"
              value={eEvaluatedAt}
              onChange={(event) => setEEvaluatedAt(event.target.value)}
              required
              aria-label="Evaluated on"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-[color:var(--fs-text-muted)]">Outcome</span>
            <select
              className="fs-select"
              value={eOutcome}
              onChange={(event) => setEOutcome(event.target.value)}
              aria-label="Outcome"
            >
              <option value="progressed">Progressed</option>
              <option value="hold">Holding at level</option>
              <option value="review_in_4_weeks">Review in 4 weeks</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-[color:var(--fs-text-muted)]">Strengths (one per line)</span>
            <textarea
              className="fs-textarea"
              rows={3}
              placeholder="- Confident pool entries"
              value={eStrengths}
              onChange={(event) => setEStrengths(event.target.value)}
              aria-label="Strengths"
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-[color:var(--fs-text-muted)]">Areas to work on (one per line)</span>
            <textarea
              className="fs-textarea"
              rows={3}
              placeholder="- Build to 5-sec float"
              value={eAreas}
              onChange={(event) => setEAreas(event.target.value)}
              aria-label="Areas to work on"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-[color:var(--fs-text-muted)]">Next step level (code, optional)</span>
            <input
              className="fs-input"
              type="text"
              maxLength={64}
              placeholder="e.g. learn-to-swim"
              value={eNextLevel}
              onChange={(event) => setENextLevel(event.target.value)}
              aria-label="Next step level code"
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-[color:var(--fs-text-muted)]">Next step summary (optional)</span>
            <textarea
              className="fs-textarea"
              rows={2}
              placeholder="What is the child working toward?"
              value={eNextSummary}
              onChange={(event) => setENextSummary(event.target.value)}
              aria-label="Next step summary"
            />
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="fs-button" disabled={result.kind === 'submitting'}>
              {result.kind === 'submitting' ? 'Saving…' : 'Save evaluation'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </form>
      )}

      {result.kind === 'progress_ok' ? (
        <div className="fs-card-flat mt-4" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--fs-text)]">
            <CheckCircle2 size={14} aria-hidden="true" />
            Lesson note saved for {formatDate(result.entry.session_date)}.
          </div>
          {result.entry.focus_skill ? (
            <div className="mt-1 text-xs text-[color:var(--fs-text-muted)]">
              Focus: {result.entry.focus_skill}
            </div>
          ) : null}
        </div>
      ) : null}

      {result.kind === 'evaluation_ok' ? (
        <div className="fs-card-flat mt-4" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--fs-text)]">
            <CheckCircle2 size={14} aria-hidden="true" />
            Evaluation saved for {formatDate(result.entry.evaluated_at)}.
          </div>
          {result.entry.level_outcome ? (
            <div className="mt-1 text-xs text-[color:var(--fs-text-muted)]">
              Outcome: {result.entry.level_outcome}
            </div>
          ) : null}
        </div>
      ) : null}

      {result.kind === 'error' ? (
        <div
          className="fs-card-flat mt-4 text-sm"
          style={{ borderColor: 'var(--fs-danger)', color: 'var(--fs-danger)' }}
          role="alert"
        >
          {result.message}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Students table (each row expandable to write panel)
// ---------------------------------------------------------------------------

function StudentsTable({
  students,
  sessionToken,
}: {
  students: FutureSwimCoachStudentSummary[];
  sessionToken: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!students.length) {
    return (
      <div className="fs-card-flat mt-6 text-sm text-[color:var(--fs-text-muted)]">
        You don't have any students yet at your assigned centres. Check with your centre
        manager that your <code>assigned_centre_codes</code> match the active student
        roster.
      </div>
    );
  }

  return (
    <section className="fs-card mt-6" aria-label="Students roster">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="fs-kicker">Your students</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--fs-text)]">
            {students.length} active student{students.length === 1 ? '' : 's'}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--fs-text-muted)]">
            Click any row to log a lesson note or record an evaluation.
          </p>
        </div>
        <span className="fs-chip">
          <CalendarDays size={12} aria-hidden="true" /> {students.length}
        </span>
      </header>

      <ol className="fs-coach-table mt-4">
        {students.map((student) => {
          const expanded = expandedId === student.id;
          const age = ageInYears(student.date_of_birth);
          return (
            <li key={student.id} className={`fs-coach-row ${expanded ? 'fs-coach-row-open' : ''}`}>
              <button
                type="button"
                className="fs-coach-row-button"
                aria-expanded={expanded}
                aria-controls={`coach-write-${student.id}`}
                onClick={() => setExpandedId(expanded ? null : student.id)}
              >
                <span className="fs-student-avatar" aria-hidden="true">
                  <GraduationCap size={18} />
                </span>
                <span className="fs-coach-row-main">
                  <span className="text-base font-semibold text-[color:var(--fs-text)]">
                    {student.full_name}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[color:var(--fs-text-muted)]">
                    {age != null ? <span>{age} yr</span> : null}
                    {student.centre_code ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{centreLabel(student.centre_code)}</span>
                      </>
                    ) : null}
                    {student.last_session_date ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Last session {formatDate(student.last_session_date)}</span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>No sessions logged yet</span>
                      </>
                    )}
                    {student.parent_email ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{student.parent_email}</span>
                      </>
                    ) : null}
                  </span>
                </span>
                <span className="fs-coach-row-meta">
                  <span className="fs-chip">
                    <Waves size={12} aria-hidden="true" /> {levelLabel(student.current_level_code)}
                  </span>
                  {expanded ? (
                    <ChevronUp size={16} aria-hidden="true" />
                  ) : (
                    <ChevronDown size={16} aria-hidden="true" />
                  )}
                </span>
              </button>
              {expanded ? (
                <div id={`coach-write-${student.id}`}>
                  <WritePanel
                    student={student}
                    sessionToken={sessionToken}
                    onClose={() => setExpandedId(null)}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------

export function FutureSwimCoachApp() {
  const [sessionToken, setSessionToken] = useState<string | null>(readStoredSessionToken);
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'idle' });

  const [loginStage, setLoginStage] = useState<LoginStage>('request_email');
  const [emailDraft, setEmailDraft] = useState<string>('');
  const [codeDraft, setCodeDraft] = useState<string>('');
  const [loginNotice, setLoginNotice] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  const isAuthenticated = Boolean(sessionToken);

  useEffect(() => {
    document.title = 'Future Swim · Coach dashboard';
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!sessionToken) {
      setLoadState({ kind: 'idle' });
      return;
    }
    setLoadState({ kind: 'loading' });
    (async () => {
      try {
        const response = await fetch('/api/v1/futureswim/coach/me', {
          headers: { accept: 'application/json', Authorization: `Bearer ${sessionToken}` },
        });
        const json = (await response.json()) as FutureSwimCoachApiResponse<FutureSwimCoachMePayload>;
        if (cancelled) return;
        if (!response.ok || json.status !== 'ok' || !json.data) {
          if (response.status === 401) {
            persistSessionToken(null);
            setSessionToken(null);
            setLoadState({ kind: 'idle' });
            setLoginError('Your coach session expired. Sign in again with your email.');
            return;
          }
          const message =
            (json as { error?: { message?: string }; message?: string }).error?.message ||
            (json as { message?: string }).message ||
            "We couldn't load your coach dashboard.";
          setLoadState({ kind: 'error', message });
          return;
        }
        setLoadState({ kind: 'ready', payload: json.data });
      } catch (err) {
        if (cancelled) return;
        setLoadState({
          kind: 'error',
          message:
            err instanceof Error
              ? `We couldn't load your coach dashboard: ${err.message}.`
              : "We couldn't load your coach dashboard right now. Try again in a moment.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  const summary = useMemo(() => {
    if (loadState.kind !== 'ready') return null;
    return loadState.payload;
  }, [loadState]);

  async function handleRequestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = emailDraft.trim();
    if (!email || !email.includes('@')) {
      setLoginError('Please enter the email Future Swim has on file for you.');
      return;
    }
    setLoginStage('submitting');
    setLoginError('');
    setLoginNotice('');
    try {
      const response = await fetch('/api/v1/futureswim/coach/login/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        throw new Error(`Server error (HTTP ${response.status}).`);
      }
      setLoginStage('verify_code');
      setLoginNotice(
        `If that email matches a Future Swim coach account, we sent a 6-digit code. Check your inbox (and spam) — the code is valid for 15 minutes.`,
      );
    } catch (err) {
      setLoginStage('request_email');
      setLoginError(
        err instanceof Error ? `We couldn't send your code: ${err.message}` : "We couldn't send your code right now.",
      );
    }
  }

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = emailDraft.trim();
    const code = codeDraft.trim();
    if (!email || !code) {
      setLoginError('Enter your email and the 6-digit code from your inbox.');
      return;
    }
    setLoginStage('submitting');
    setLoginError('');
    try {
      const response = await fetch('/api/v1/futureswim/coach/login/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const json = (await response.json()) as FutureSwimCoachApiResponse<FutureSwimCoachLoginVerifyPayload>;
      if (!response.ok || json.status !== 'ok' || !('data' in json) || !json.data) {
        const message =
          (json as { error?: { message?: string }; message?: string }).error?.message ||
          (json as { message?: string }).message ||
          'That code is invalid or has expired. Request a new code from the sign-in page.';
        setLoginStage('verify_code');
        setLoginError(message);
        return;
      }
      const token = json.data.session_token;
      persistSessionToken(token);
      setSessionToken(token);
      setCodeDraft('');
      setLoginStage('request_email');
      setLoginNotice('');
    } catch (err) {
      setLoginStage('verify_code');
      setLoginError(
        err instanceof Error ? `We couldn't verify your code: ${err.message}` : "We couldn't verify your code right now.",
      );
    }
  }

  function handleLogout() {
    persistSessionToken(null);
    setSessionToken(null);
    setEmailDraft('');
    setCodeDraft('');
    setLoginStage('request_email');
    setLoginNotice('');
    setLoginError('');
    setLoadState({ kind: 'idle' });
  }

  return (
    <div className="fs-app">
      <main className="fs-shell">
        <div className="fs-container py-10 sm:py-14">
          {!isAuthenticated ? (
            <section className="fs-card-feature mx-auto max-w-2xl">
              <div className="fs-kicker">Coach dashboard · Sign in</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--fs-text)]">
                Sign in to log lessons + evaluations
              </h1>
              <p className="mt-3 text-sm leading-6 text-[color:var(--fs-text-muted)]">
                Sign in with the email Future Swim has on file. We'll send a 6-digit code so you don't have to remember a password.
              </p>

              {loginStage === 'verify_code' ? (
                <form className="mt-6 grid gap-3" onSubmit={handleVerifyCode}>
                  <div className="text-sm text-[color:var(--fs-text-muted)]" data-testid="login-email-echo">
                    Code sent to <strong>{emailDraft}</strong>.{' '}
                    <button
                      type="button"
                      className="underline text-[color:var(--fs-primary-dark)]"
                      onClick={() => {
                        setLoginStage('request_email');
                        setLoginError('');
                        setLoginNotice('');
                        setCodeDraft('');
                      }}
                    >
                      Use a different email
                    </button>
                  </div>
                  <input
                    className="fs-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    placeholder="6-digit code"
                    aria-label="Sign-in code"
                    value={codeDraft}
                    onChange={(event) => setCodeDraft(event.target.value)}
                  />
                  <button type="submit" className="fs-button" disabled={!codeDraft.trim()}>
                    Verify code <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={handleRequestCode}>
                  <input
                    className="fs-input flex-1"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="coach@futureswim.bookedai.au"
                    aria-label="Email address"
                    value={emailDraft}
                    onChange={(event) => setEmailDraft(event.target.value)}
                  />
                  <button type="submit" className="fs-button" disabled={loginStage === 'submitting' || !emailDraft.trim()}>
                    {loginStage === 'submitting' ? 'Sending code…' : 'Email me a code'}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </form>
              )}

              {loginNotice ? (
                <div className="fs-card-flat mt-4 text-sm text-[color:var(--fs-text-muted)]">{loginNotice}</div>
              ) : null}
              {loginError ? (
                <div
                  className="fs-card-flat mt-4 text-sm"
                  style={{ borderColor: 'var(--fs-danger)', color: 'var(--fs-danger)' }}
                >
                  {loginError}
                </div>
              ) : null}
            </section>
          ) : null}

          {loadState.kind === 'loading' ? (
            <div className="fs-card-flat mt-6 text-sm text-[color:var(--fs-text-muted)]">
              Loading your Future Swim coach dashboard…
            </div>
          ) : null}

          {loadState.kind === 'error' ? (
            <div className="fs-card-flat mt-6">
              <div className="fs-kicker">Dashboard unavailable</div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--fs-text)]">{loadState.message}</p>
              <button type="button" className="mt-3 fs-button-ghost" onClick={handleLogout}>
                Sign out and try again
              </button>
            </div>
          ) : null}

          {summary && sessionToken ? (
            <>
              <CoachHeader coach={summary.coach} onLogout={handleLogout} />
              <StudentsTable students={summary.students} sessionToken={sessionToken} />
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--fs-text-soft)]">
                <span>
                  Future Swim coach dashboard · Powered by BookedAI ·{' '}
                  <a href="https://futureswim.bookedai.au/">Back to homepage</a>
                </span>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
