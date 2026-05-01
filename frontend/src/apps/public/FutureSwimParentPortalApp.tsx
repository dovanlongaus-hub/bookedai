import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  GraduationCap,
  MapPin,
  Sparkles,
  Waves,
} from 'lucide-react';

import '../../theme/future-swim-tokens.css';

import { FUTURE_SWIM_CENTRES } from './futureswim/centres';
import { FUTURE_SWIM_LEVELS } from './futureswim/levels';
import {
  FUTURE_SWIM_DEMO_PORTAL_KEY,
  type FutureSwimEvaluation,
  type FutureSwimParentSummary,
  type FutureSwimPortalPayload,
  type FutureSwimPortalResponse,
  type FutureSwimProgressEntry,
  type FutureSwimStudentSummary,
} from './futureswim/portal-types';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; payload: FutureSwimPortalPayload }
  | { kind: 'error'; message: string };

const ATTENDANCE_LABEL: Record<number, { label: string; tone: 'ok' | 'late' | 'absent' }> = {
  0: { label: 'Absent', tone: 'absent' },
  1: { label: 'Present', tone: 'ok' },
  2: { label: 'Present (late)', tone: 'late' },
};

const OUTCOME_LABEL: Record<string, string> = {
  progressed: 'Progressed',
  hold: 'Holding at level',
  review_in_4_weeks: 'Review in 4 weeks',
};

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

function renderMarkdownBullets(md: string | null) {
  if (!md) return null;
  const lines = md
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  if (!lines.length) return null;
  return (
    <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[color:var(--fs-text)]">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[color:var(--fs-primary)]" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

function ParentGreeting({ parent, isDemo }: { parent: FutureSwimParentSummary; isDemo: boolean }) {
  const givenName = (parent.full_name || '').split(' ')[0] || 'there';
  return (
    <header className="fs-card-feature mt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="fs-kicker">Parent portal</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--fs-text)] sm:text-4xl">
            Welcome back, {givenName}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--fs-text-muted)]">
            Here's what your coach has logged for each child — recent lesson focus, attendance, and the next step they're working toward.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {parent.centre_code ? (
            <span className="fs-chip">
              <MapPin size={12} aria-hidden="true" /> {centreLabel(parent.centre_code)}
            </span>
          ) : null}
          {isDemo ? (
            <span className="fs-chip-coral fs-chip">
              <Sparkles size={12} aria-hidden="true" /> Demo data
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function ProgressTimeline({ entries }: { entries: FutureSwimProgressEntry[] }) {
  if (!entries.length) {
    return (
      <div className="fs-card-flat mt-3 text-sm text-[color:var(--fs-text-muted)]">
        No lesson notes have been logged yet. Your coach will add the first one after the next session.
      </div>
    );
  }
  return (
    <ol className="mt-3 space-y-3">
      {entries.map((entry, i) => {
        const attendance = entry.attendance != null ? ATTENDANCE_LABEL[entry.attendance] : null;
        return (
          <li key={i} className="fs-card-flat">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--fs-text)]">
                <Clock size={14} aria-hidden="true" />
                {formatDate(entry.session_date)}
                <span className="text-[color:var(--fs-text-soft)]">·</span>
                <span className="text-[color:var(--fs-text-muted)]">{levelLabel(entry.level_code)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {entry.coach_initials ? (
                  <span className="fs-chip" aria-label={`Coach initials ${entry.coach_initials}`}>
                    Coach {entry.coach_initials}
                  </span>
                ) : null}
                {attendance ? (
                  <span
                    className={`fs-chip ${attendance.tone === 'absent' ? 'fs-chip-warn' : ''}`}
                    aria-label={`Attendance: ${attendance.label}`}
                  >
                    {attendance.label}
                  </span>
                ) : null}
              </div>
            </div>
            {entry.focus_skill ? (
              <div className="mt-2 text-sm font-semibold text-[color:var(--fs-text)]">
                <span className="text-[color:var(--fs-text-soft)]">Focus:</span> {entry.focus_skill}
              </div>
            ) : null}
            {entry.notes_md ? (
              <p className="mt-2 text-sm leading-6 text-[color:var(--fs-text-muted)]">{entry.notes_md}</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function EvaluationCard({ evaluation }: { evaluation: FutureSwimEvaluation | null }) {
  if (!evaluation) {
    return (
      <div className="fs-card-flat text-sm text-[color:var(--fs-text-muted)]">
        Your coach will share the first formal evaluation after a few sessions. Until then, see the lesson timeline.
      </div>
    );
  }
  const outcome = evaluation.level_outcome ? OUTCOME_LABEL[evaluation.level_outcome] || evaluation.level_outcome : null;
  return (
    <div className="fs-card-feature">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="fs-kicker">Latest evaluation</div>
          <div className="mt-2 text-lg font-semibold tracking-tight text-[color:var(--fs-text)]">
            {levelLabel(evaluation.level_code)}
            {outcome ? (
              <span className="ml-3 fs-chip-coral fs-chip text-xs font-semibold">
                <CheckCircle2 size={12} aria-hidden="true" /> {outcome}
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-[color:var(--fs-text-soft)]">
            {formatDate(evaluation.evaluated_at)}
            {evaluation.coach_initials ? ` · Coach ${evaluation.coach_initials}` : ''}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-sm font-semibold text-[color:var(--fs-text)]">Strengths</div>
          {renderMarkdownBullets(evaluation.strengths_md)}
        </div>
        <div>
          <div className="text-sm font-semibold text-[color:var(--fs-text)]">To work on</div>
          {renderMarkdownBullets(evaluation.areas_to_work_on_md)}
        </div>
      </div>

      {evaluation.next_step_summary ? (
        <div className="mt-5 fs-card-flat">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--fs-primary-dark)]">
            <Compass size={12} aria-hidden="true" /> Next step
          </div>
          <div className="mt-2 text-sm font-semibold text-[color:var(--fs-text)]">
            Toward {levelLabel(evaluation.next_step_level_code)}
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--fs-text-muted)]">{evaluation.next_step_summary}</p>
        </div>
      ) : null}
    </div>
  );
}

function StudentSection({ student }: { student: FutureSwimStudentSummary }) {
  const age = ageInYears(student.date_of_birth);
  return (
    <section className="fs-card mt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="fs-student-avatar">
            <GraduationCap size={20} />
          </span>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--fs-text)]">{student.full_name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--fs-text-muted)]">
              {age != null ? <span>{age} yr</span> : null}
              {student.centre_code ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{centreLabel(student.centre_code)}</span>
                </>
              ) : null}
              {student.enrolled_since ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Enrolled {formatDate(student.enrolled_since)}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <span className="fs-chip">
          <Waves size={12} aria-hidden="true" /> {levelLabel(student.current_level_code)}
        </span>
      </header>

      {student.notes_for_coach ? (
        <div className="mt-4 fs-card-flat">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--fs-primary-dark)]">
            Notes for coach
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--fs-text-muted)]">{student.notes_for_coach}</p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <h3 className="fs-kicker">Lesson timeline</h3>
          <ProgressTimeline entries={student.recent_progress} />
        </div>
        <div>
          <h3 className="fs-kicker">Roadmap</h3>
          <div className="mt-3">
            <EvaluationCard evaluation={student.latest_evaluation} />
          </div>
        </div>
      </div>
    </section>
  );
}

function readPortalKey(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const explicit = (params.get('key') || '').trim();
  if (explicit) return explicit;
  if (params.get('demo') === '1') return FUTURE_SWIM_DEMO_PORTAL_KEY;
  return '';
}

const SESSION_TOKEN_STORAGE_KEY = 'futureswim.portal.sessionToken';

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
    /* localStorage unavailable — fall back to in-memory session only */
  }
}

type LoginStage = 'request_email' | 'verify_code' | 'submitting';

export function FutureSwimParentPortalApp() {
  const [keyValue, setKeyValue] = useState<string>(readPortalKey);
  const [sessionToken, setSessionToken] = useState<string | null>(readStoredSessionToken);
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'idle' });

  const [loginStage, setLoginStage] = useState<LoginStage>('request_email');
  const [emailDraft, setEmailDraft] = useState<string>('');
  const [codeDraft, setCodeDraft] = useState<string>('');
  const [loginNotice, setLoginNotice] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  const isDemo = keyValue === FUTURE_SWIM_DEMO_PORTAL_KEY;
  const isAuthenticated = Boolean(sessionToken);

  useEffect(() => {
    document.title = 'Future Swim · Parent portal';
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!keyValue && !sessionToken) {
      setLoadState({ kind: 'idle' });
      return;
    }
    setLoadState({ kind: 'loading' });
    (async () => {
      try {
        let response: Response;
        if (sessionToken) {
          response = await fetch('/api/v1/futureswim/portal/me', {
            headers: { accept: 'application/json', Authorization: `Bearer ${sessionToken}` },
          });
        } else {
          response = await fetch(
            `/api/v1/futureswim/portal/preview?key=${encodeURIComponent(keyValue)}`,
            { headers: { accept: 'application/json' } },
          );
        }
        const json = (await response.json()) as FutureSwimPortalResponse;
        if (cancelled) return;
        if (!response.ok || json.status !== 'ok' || !json.data) {
          if (response.status === 401 && sessionToken) {
            persistSessionToken(null);
            setSessionToken(null);
            setLoadState({ kind: 'idle' });
            setLoginError('Your portal session expired. Sign in again with your email.');
            return;
          }
          const message =
            (json as { message?: string }).message ||
            'That portal link has expired or is not recognised. Reply to your Future Swim welcome email to get a fresh link.';
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
              ? `We couldn't load your portal: ${err.message}.`
              : "We couldn't load your portal right now. Try again in a moment.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [keyValue, sessionToken]);

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
      const response = await fetch('/api/v1/futureswim/portal/login/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        throw new Error(`Server error (HTTP ${response.status}).`);
      }
      setLoginStage('verify_code');
      setLoginNotice(
        `If that email matches a Future Swim portal account, we sent a 6-digit code. Check your inbox (and spam) — the code is valid for 15 minutes.`,
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
      const response = await fetch('/api/v1/futureswim/portal/login/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const json = (await response.json()) as
        | { status: 'ok'; data: { session_token: string } }
        | { status: 'error'; error?: { message?: string } };
      if (!response.ok || json.status !== 'ok' || !('data' in json)) {
        const message =
          (json as { error?: { message?: string } }).error?.message ||
          'That code is invalid or has expired. Request a new code from the portal.';
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
    setKeyValue('');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  return (
    <div className="fs-app">
      <main className="fs-shell">
        <div className="fs-container py-10 sm:py-14">
          {!keyValue && !isAuthenticated ? (
            <section className="fs-card-feature mx-auto max-w-2xl">
              <div className="fs-kicker">Parent portal · Sign in</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--fs-text)]">
                Open your Future Swim portal
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
                    placeholder="parent@example.com"
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

              <button
                type="button"
                className="mt-6 fs-button-ghost"
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('demo', '1');
                  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
                  setKeyValue(FUTURE_SWIM_DEMO_PORTAL_KEY);
                }}
              >
                <Sparkles size={14} aria-hidden="true" /> Or open the demo portal
              </button>
            </section>
          ) : null}

          {loadState.kind === 'loading' ? (
            <div className="fs-card-flat mt-6 text-sm text-[color:var(--fs-text-muted)]">
              Loading your Future Swim portal…
            </div>
          ) : null}

          {loadState.kind === 'error' ? (
            <div className="fs-card-flat mt-6">
              <div className="fs-kicker">Portal unavailable</div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--fs-text)]">{loadState.message}</p>
              <button
                type="button"
                className="mt-3 fs-button-ghost"
                onClick={handleLogout}
              >
                Sign out and try again
              </button>
            </div>
          ) : null}

          {summary ? (
            <>
              <ParentGreeting parent={summary.parent} isDemo={isDemo} />
              {summary.students.length === 0 ? (
                <div className="fs-card-flat mt-6 text-sm text-[color:var(--fs-text-muted)]">
                  No students are linked to this account yet. Email your Future Swim centre and we'll get them set up.
                </div>
              ) : (
                summary.students.map((student) => <StudentSection key={student.id} student={student} />)
              )}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--fs-text-soft)]">
                <span>
                  Future Swim parent portal · Powered by BookedAI ·{' '}
                  <a href="https://futureswim.bookedai.au/">Back to homepage</a>
                </span>
                {isAuthenticated ? (
                  <button
                    type="button"
                    className="fs-button-ghost"
                    onClick={handleLogout}
                    aria-label="Sign out of Future Swim portal"
                  >
                    Sign out
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
