import { type FormEvent, useEffect, useMemo, useState } from 'react';

import type {
  TenantStudentItem,
  TenantStudentProgressUpdateRequest,
} from '../../shared/contracts';

type TenantStudentsWorkspaceProps = {
  students: TenantStudentItem[] | null;
  loading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  submittingContactId: string | null;
  saveMessage: string | null;
  saveErrorMessage: string | null;
  onSaveProgress: (
    contactId: string,
    payload: TenantStudentProgressUpdateRequest,
  ) => Promise<void> | void;
};

type ProgressFormState = {
  session_date: string;
  level: string;
  attendance: string;
  notes: string;
  next_focus: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): ProgressFormState {
  return {
    session_date: todayIsoDate(),
    level: '',
    attendance: '1',
    notes: '',
    next_focus: '',
  };
}

function formStateFromEntry(student: TenantStudentItem): ProgressFormState {
  if (student.latest_progress) {
    return {
      session_date: student.latest_progress.session_date || todayIsoDate(),
      level: student.latest_progress.level ?? '',
      attendance: String(student.latest_progress.attendance ?? 1),
      notes: student.latest_progress.notes ?? '',
      next_focus: student.latest_progress.next_focus ?? '',
    };
  }
  return emptyForm();
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'No progress recorded';
  }
  try {
    return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function TenantStudentsWorkspace({
  students,
  loading,
  errorMessage,
  onRefresh,
  submittingContactId,
  saveMessage,
  saveErrorMessage,
  onSaveProgress,
}: TenantStudentsWorkspaceProps) {
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [form, setForm] = useState<ProgressFormState>(emptyForm);
  const [validationError, setValidationError] = useState<string | null>(null);

  const activeStudent = useMemo(
    () => (students ?? []).find((student) => student.contact_id === activeContactId) ?? null,
    [students, activeContactId],
  );

  useEffect(() => {
    if (!activeStudent) {
      return;
    }
    setForm(formStateFromEntry(activeStudent));
    setValidationError(null);
  }, [activeStudent?.contact_id]);

  const filterableCount = (students ?? []).length;
  const haveAny = filterableCount > 0;

  function handleOpen(contactId: string) {
    setActiveContactId(contactId);
  }

  function handleClose() {
    setActiveContactId(null);
    setValidationError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeStudent) {
      return;
    }

    const trimmedDate = form.session_date.trim();
    const trimmedLevel = form.level.trim();
    const attendanceNumber = Number.parseInt(form.attendance.trim(), 10);

    if (!trimmedDate) {
      setValidationError('Session date is required.');
      return;
    }
    if (!trimmedLevel) {
      setValidationError('Level is required.');
      return;
    }
    if (!Number.isInteger(attendanceNumber) || attendanceNumber < 0) {
      setValidationError('Attendance must be a whole number greater than or equal to zero.');
      return;
    }

    setValidationError(null);
    await onSaveProgress(activeStudent.contact_id, {
      session_date: trimmedDate,
      level: trimmedLevel,
      attendance: attendanceNumber,
      notes: form.notes.trim(),
      next_focus: form.next_focus.trim(),
    });
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.4fr_0.6fr]">
      <article
        id="tenant-students-list"
        className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Student progress
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Students
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review every student who has booked a class with this business and capture the next
              progress note from the latest session.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {loading && !students ? (
            [...Array(3)].map((_, index) => (
              <div
                key={`student-skeleton-${index}`}
                className="h-20 animate-pulse rounded-[1.25rem] bg-slate-100"
              />
            ))
          ) : !haveAny ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <div className="text-sm font-semibold text-slate-700">
                No students with bookings yet
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Once parents or learners book a class, they will appear here so you can track
                progress, attendance, and the next focus area for every session.
              </p>
            </div>
          ) : (
            (students ?? []).map((student) => {
              const isActive = student.contact_id === activeContactId;
              const latest = student.latest_progress;
              return (
                <article
                  key={student.contact_id}
                  className={`rounded-[1.25rem] border px-4 py-4 transition ${
                    isActive
                      ? 'border-slate-950 bg-slate-50 shadow-[0_18px_44px_rgba(15,23,42,0.10)]'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-950">
                        {student.full_name || 'Unnamed student'}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {student.email ?? 'No email on file'}
                        {student.current_program ? ` · ${student.current_program}` : ''}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          Last session: {formatDate(latest?.session_date)}
                        </span>
                        {latest?.level ? (
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                            Level: {latest.level}
                          </span>
                        ) : null}
                        {typeof latest?.attendance === 'number' ? (
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                            Attendance: {latest.attendance}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpen(student.contact_id)}
                      className="booked-button shrink-0"
                    >
                      Update progress
                    </button>
                  </div>
                  {latest?.notes ? (
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
                      {latest.notes}
                    </p>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </article>

      <article
        id="tenant-student-progress-editor"
        className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Progress note
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          {activeStudent ? `Update ${activeStudent.full_name || 'student'}` : 'Select a student'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {activeStudent
            ? 'Capture the latest session date, level, attendance count, written notes, and the next focus area so the rest of the team can pick up where you left off.'
            : 'Choose a student on the left to record a new progress note for their most recent session.'}
        </p>

        {!activeStudent ? (
          <div className="mt-6 rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No student selected yet.
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Session date
                </span>
                <input
                  type="date"
                  value={form.session_date}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, session_date: event.target.value }))
                  }
                  className="mt-2 w-full rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-slate-500 focus:outline-none"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Level
                </span>
                <input
                  type="text"
                  value={form.level}
                  placeholder="e.g. Beginner, Intermediate, 1200 ELO"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, level: event.target.value }))
                  }
                  className="mt-2 w-full rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-slate-500 focus:outline-none"
                  required
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Attendance count
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={form.attendance}
                onChange={(event) =>
                  setForm((current) => ({ ...current, attendance: event.target.value }))
                }
                className="mt-2 w-full rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-slate-500 focus:outline-none"
                required
              />
              <span className="mt-1 block text-[11px] text-slate-500">
                Total sessions attended so far this program.
              </span>
            </label>

            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Session notes
              </span>
              <textarea
                value={form.notes}
                placeholder="What did the student work on this session? Highlight wins or struggles."
                rows={4}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                className="mt-2 w-full rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </label>

            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Next focus
              </span>
              <input
                type="text"
                value={form.next_focus}
                placeholder="e.g. Endgame fundamentals, freestyle drill, exam prep"
                onChange={(event) =>
                  setForm((current) => ({ ...current, next_focus: event.target.value }))
                }
                className="mt-2 w-full rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </label>

            {validationError ? (
              <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {validationError}
              </div>
            ) : null}

            {saveErrorMessage ? (
              <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {saveErrorMessage}
              </div>
            ) : null}

            {saveMessage ? (
              <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {saveMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submittingContactId === activeStudent.contact_id}
                className="booked-button disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingContactId === activeStudent.contact_id
                  ? 'Saving...'
                  : 'Save progress'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </form>
        )}
      </article>
    </section>
  );
}
