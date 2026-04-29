/**
 * AI Mentor Academy panel — tenant-side workspace for the
 * `aimentor@bookedai.au` admin to:
 *   • list every learner under the AI Mentor tenant
 *   • mark attendance + log a progress note after each session
 *
 * Backend endpoints (registered in `v1_router.include_router(
 * tenant_ai_mentor_progress_router)`):
 *   GET   /api/v1/tenants/me/aimentor-students
 *   PATCH /api/v1/tenants/me/aimentor-students/{contact_id}/progress
 *
 * Mount points (no tight coupling to a single shell):
 *   1. tenant.bookedai.au (TenantApp.tsx) — render inside an "Academy" tab
 *      the tenant admin opens after Google sign-in. Pass the active
 *      `sessionToken` from the existing tenant session helper.
 *   2. admin.bookedai.au (AdminPage.tsx) — register a new
 *      `'ai-mentor-academy'` workspace id and render this component when
 *      `activeWorkspace === 'ai-mentor-academy'`. Pass the platform-admin
 *      tenant session for `ai-mentor-doer`.
 *
 * The component is intentionally self-contained: no Redux / context, no
 * apiV1 dependency. Direct fetch lets us drop it anywhere a session token
 * is available.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

type Locale = 'en' | 'vi';

type Progress = {
  session_date: string | null;
  program_track: string | null;
  skill_level: string | null;
  attendance: number | null;
  notes: string | null;
  next_focus: string | null;
  artifact_url: string | null;
};

type Student = {
  contact_id: string;
  full_name: string | null;
  email: string | null;
  current_program: string | null;
  latest_progress: Progress | null;
};

type StudentsResponse = {
  status?: string;
  data?: { students: Student[] };
  error?: { message?: string };
};

type ProgressResponse = {
  status?: string;
  data?: { progress: Progress & { id: string; tenant_id: string; contact_id: string } };
  error?: { message?: string };
};

type FormState = {
  session_date: string;
  program_track: string;
  skill_level: string;
  attendance: string;
  notes: string;
  next_focus: string;
  artifact_url: string;
};

const dict = {
  en: {
    title: 'AI Mentor Academy',
    lead:
      'Every learner who has booked an AI Mentor program. Add a progress note after each session — students see it in their account.',
    refresh: 'Refresh',
    loading: 'Loading students…',
    loadError: 'Could not load students. Try refreshing.',
    empty: 'No AI Mentor students yet. Once learners book, they appear here.',
    columns: {
      learner: 'Learner',
      contact: 'Contact',
      program: 'Latest program',
      lastSession: 'Last note',
    },
    actions: {
      logProgress: 'Log progress',
      cancel: 'Cancel',
      save: 'Save progress note',
      saving: 'Saving…',
    },
    form: {
      sessionDate: 'Session date',
      track: 'Program track',
      skillLevel: 'Skill level',
      attendance: 'Attendance (1-10)',
      notes: 'Mentor notes',
      nextFocus: 'Next focus',
      artifact: 'Artifact URL (optional)',
    },
    placeholders: {
      track: 'e.g. RAG / Agents / Product Ops',
      skillLevel: 'e.g. Builder L2',
      attendance: '1 = absent, 10 = engaged',
      notes:
        'What did the learner build today? What clicked? What needs reinforcement?',
      nextFocus: 'What should they tackle next session?',
      artifact: 'https://...',
    },
    successToast: 'Progress saved.',
    errorToast: 'Could not save progress. Try again.',
    none: '—',
  },
  vi: {
    title: 'AI Mentor — Học viện',
    lead:
      'Mọi học viên đã đặt chương trình AI Mentor. Thêm ghi chú tiến độ sau mỗi buổi — học viên sẽ thấy trong tài khoản của họ.',
    refresh: 'Làm mới',
    loading: 'Đang tải danh sách học viên…',
    loadError: 'Không tải được danh sách. Vui lòng làm mới.',
    empty:
      'Chưa có học viên AI Mentor. Khi có người đặt chỗ, họ sẽ hiện ra đây.',
    columns: {
      learner: 'Học viên',
      contact: 'Liên hệ',
      program: 'Chương trình mới nhất',
      lastSession: 'Ghi chú gần nhất',
    },
    actions: {
      logProgress: 'Ghi tiến độ',
      cancel: 'Huỷ',
      save: 'Lưu ghi chú',
      saving: 'Đang lưu…',
    },
    form: {
      sessionDate: 'Ngày buổi học',
      track: 'Track chương trình',
      skillLevel: 'Trình độ',
      attendance: 'Mức tham gia (1-10)',
      notes: 'Ghi chú từ mentor',
      nextFocus: 'Trọng tâm kế tiếp',
      artifact: 'Link artifact (tuỳ chọn)',
    },
    placeholders: {
      track: 'VD: RAG / Agents / Vận hành sản phẩm',
      skillLevel: 'VD: Builder L2',
      attendance: '1 = vắng, 10 = tham gia tốt',
      notes:
        'Học viên đã xây gì hôm nay? Điểm nào hiệu quả? Cần củng cố gì?',
      nextFocus: 'Buổi tới nên tập trung điều gì?',
      artifact: 'https://...',
    },
    successToast: 'Đã lưu tiến độ.',
    errorToast: 'Không lưu được. Vui lòng thử lại.',
    none: '—',
  },
} as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    session_date: todayIso(),
    program_track: '',
    skill_level: '',
    attendance: '',
    notes: '',
    next_focus: '',
    artifact_url: '',
  };
}

export type AIMentorAcademyPanelProps = {
  /**
   * Tenant session token — the same one TenantApp passes to apiV1 helpers
   * (e.g. ``apiV1.tenantListStudents(sessionToken)``). When null, the panel
   * shows a sign-in prompt instead.
   */
  sessionToken: string | null;
  /**
   * Optional locale override. When omitted, falls back to the
   * `bookedai.admin.locale` localStorage entry → `'en'`.
   */
  locale?: Locale;
  /**
   * Optional className passed through to the root element so the host shell
   * can apply its own padding / background.
   */
  className?: string;
};

export function AIMentorAcademyPanel({
  sessionToken,
  locale,
  className,
}: AIMentorAcademyPanelProps) {
  const resolvedLocale: Locale = useMemo(() => {
    if (locale === 'en' || locale === 'vi') return locale;
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('bookedai.admin.locale');
        if (stored === 'vi') return 'vi';
      } catch {
        // ignore
      }
    }
    return 'en';
  }, [locale]);

  const t = dict[resolvedLocale];

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openContactId, setOpenContactId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    if (!sessionToken) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/v1/tenants/me/aimentor-students', {
        method: 'GET',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const payload = (await res.json().catch(() => null)) as StudentsResponse | null;
      if (!res.ok || !payload || payload.status !== 'ok' || !payload.data) {
        setLoadError(payload?.error?.message || t.loadError);
        setLoading(false);
        return;
      }
      setStudents(payload.data.students);
    } catch {
      setLoadError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [sessionToken, t.loadError]);

  useEffect(() => {
    if (sessionToken) {
      void loadStudents();
    }
  }, [sessionToken, loadStudents]);

  const handleOpenForm = useCallback((contactId: string) => {
    setOpenContactId(contactId);
    setForm(emptyForm());
    setSaveError(null);
    setSavedToast(null);
  }, []);

  const handleCancel = useCallback(() => {
    setOpenContactId(null);
    setForm(emptyForm());
    setSaveError(null);
  }, []);

  const handleSave = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!sessionToken || !openContactId) return;
      setSaving(true);
      setSaveError(null);
      try {
        const res = await fetch(
          `/api/v1/tenants/me/aimentor-students/${encodeURIComponent(openContactId)}/progress`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({
              session_date: form.session_date,
              program_track: form.program_track || null,
              skill_level: form.skill_level || null,
              attendance: form.attendance ? Number(form.attendance) : null,
              notes: form.notes || null,
              next_focus: form.next_focus || null,
              artifact_url: form.artifact_url || null,
            }),
          },
        );
        const payload = (await res.json().catch(() => null)) as ProgressResponse | null;
        if (!res.ok || !payload || payload.status !== 'ok') {
          setSaveError(payload?.error?.message || t.errorToast);
          setSaving(false);
          return;
        }
        setSavedToast(t.successToast);
        setOpenContactId(null);
        setForm(emptyForm());
        // Reload list so the latest_progress column reflects the new note.
        void loadStudents();
      } catch {
        setSaveError(t.errorToast);
      } finally {
        setSaving(false);
      }
    },
    [sessionToken, openContactId, form, t.errorToast, t.successToast, loadStudents],
  );

  if (!sessionToken) {
    return (
      <div className={className} style={{ padding: 22 }}>
        <p style={{ fontSize: '0.95rem', color: '#5b6b66' }}>
          Sign in with your AI Mentor tenant Google account to manage learners.
        </p>
      </div>
    );
  }

  return (
    <section
      className={className}
      style={{
        background: '#fdfaf3',
        borderRadius: 18,
        border: '1px solid rgba(15, 92, 84, 0.12)',
        padding: 24,
      }}
    >
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily:
                "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace",
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#0f5c54',
            }}
          >
            ai-mentor-doer
          </div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', Inter, sans-serif",
              fontSize: '1.6rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#061614',
              marginTop: 6,
            }}
          >
            {t.title}
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              color: '#5b6b66',
              marginTop: 6,
              maxWidth: 560,
              lineHeight: 1.6,
            }}
          >
            {t.lead}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadStudents()}
          disabled={loading}
          style={{
            padding: '10px 18px',
            borderRadius: 12,
            border: '1px solid rgba(15, 92, 84, 0.22)',
            background: '#ffffff',
            color: '#0f5c54',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {loading ? t.loading : t.refresh}
        </button>
      </header>

      {savedToast ? (
        <div
          role="status"
          style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(47, 158, 117, 0.12)',
            color: '#2f9e75',
            border: '1px solid rgba(47, 158, 117, 0.32)',
            fontSize: '0.9rem',
          }}
        >
          {savedToast}
        </div>
      ) : null}

      {loadError ? (
        <div
          role="alert"
          style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(192, 57, 43, 0.1)',
            color: '#c0392b',
            border: '1px solid rgba(192, 57, 43, 0.3)',
            fontSize: '0.9rem',
          }}
        >
          {loadError}
        </div>
      ) : null}

      <div style={{ marginTop: 18, overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: '#ffffff',
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid rgba(15, 92, 84, 0.1)',
          }}
        >
          <thead style={{ background: '#f5efe1' }}>
            <tr>
              <th style={cellHeader}>{t.columns.learner}</th>
              <th style={cellHeader}>{t.columns.contact}</th>
              <th style={cellHeader}>{t.columns.program}</th>
              <th style={cellHeader}>{t.columns.lastSession}</th>
              <th style={cellHeader}></th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 22,
                    textAlign: 'center',
                    color: '#5b6b66',
                    fontSize: '0.95rem',
                  }}
                >
                  {t.empty}
                </td>
              </tr>
            ) : null}

            {students.map((student) => {
              const isOpen = openContactId === student.contact_id;
              const last = student.latest_progress;
              return (
                <>
                  <tr
                    key={student.contact_id}
                    style={{ borderTop: '1px solid rgba(15, 92, 84, 0.1)' }}
                  >
                    <td style={cellBody}>
                      <strong style={{ color: '#061614' }}>
                        {student.full_name || t.none}
                      </strong>
                    </td>
                    <td style={cellBody}>{student.email || t.none}</td>
                    <td style={cellBody}>{student.current_program || t.none}</td>
                    <td style={cellBody}>
                      {last ? (
                        <span style={{ color: '#1f2a26' }}>
                          <strong>{last.session_date || ''}</strong>
                          {last.program_track ? ` · ${last.program_track}` : ''}
                          {last.skill_level ? ` · ${last.skill_level}` : ''}
                        </span>
                      ) : (
                        <span style={{ color: '#5b6b66' }}>{t.none}</span>
                      )}
                    </td>
                    <td style={cellBody}>
                      {isOpen ? (
                        <button
                          type="button"
                          onClick={handleCancel}
                          style={btnGhostStyle}
                        >
                          {t.actions.cancel}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenForm(student.contact_id)}
                          style={btnPrimaryStyle}
                        >
                          {t.actions.logProgress}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr key={`${student.contact_id}-form`}>
                      <td
                        colSpan={5}
                        style={{
                          padding: 22,
                          background: '#fdfaf3',
                          borderTop: '1px solid rgba(15, 92, 84, 0.08)',
                        }}
                      >
                        <form
                          onSubmit={handleSave}
                          style={{
                            display: 'grid',
                            gap: 14,
                            gridTemplateColumns:
                              'repeat(auto-fit, minmax(220px, 1fr))',
                          }}
                        >
                          <FormField
                            label={t.form.sessionDate}
                            value={form.session_date}
                            onChange={(v) =>
                              setForm({ ...form, session_date: v })
                            }
                            type="date"
                            required
                          />
                          <FormField
                            label={t.form.track}
                            value={form.program_track}
                            onChange={(v) =>
                              setForm({ ...form, program_track: v })
                            }
                            placeholder={t.placeholders.track}
                          />
                          <FormField
                            label={t.form.skillLevel}
                            value={form.skill_level}
                            onChange={(v) =>
                              setForm({ ...form, skill_level: v })
                            }
                            placeholder={t.placeholders.skillLevel}
                          />
                          <FormField
                            label={t.form.attendance}
                            value={form.attendance}
                            onChange={(v) =>
                              setForm({ ...form, attendance: v })
                            }
                            placeholder={t.placeholders.attendance}
                            type="number"
                          />
                          <div style={{ gridColumn: '1 / -1' }}>
                            <FormFieldArea
                              label={t.form.notes}
                              value={form.notes}
                              onChange={(v) => setForm({ ...form, notes: v })}
                              placeholder={t.placeholders.notes}
                              rows={3}
                            />
                          </div>
                          <FormField
                            label={t.form.nextFocus}
                            value={form.next_focus}
                            onChange={(v) =>
                              setForm({ ...form, next_focus: v })
                            }
                            placeholder={t.placeholders.nextFocus}
                          />
                          <FormField
                            label={t.form.artifact}
                            value={form.artifact_url}
                            onChange={(v) =>
                              setForm({ ...form, artifact_url: v })
                            }
                            placeholder={t.placeholders.artifact}
                            type="url"
                          />
                          {saveError ? (
                            <div
                              role="alert"
                              style={{
                                gridColumn: '1 / -1',
                                color: '#c0392b',
                                fontSize: '0.88rem',
                              }}
                            >
                              {saveError}
                            </div>
                          ) : null}
                          <div
                            style={{
                              gridColumn: '1 / -1',
                              display: 'flex',
                              gap: 12,
                            }}
                          >
                            <button
                              type="submit"
                              disabled={saving}
                              style={btnPrimaryStyle}
                            >
                              {saving ? t.actions.saving : t.actions.save}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancel}
                              style={btnGhostStyle}
                            >
                              {t.actions.cancel}
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : null}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const cellHeader: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '0.7rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#5b6b66',
  fontWeight: 700,
  fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
};

const cellBody: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: '0.92rem',
  color: '#1f2a26',
  verticalAlign: 'middle',
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 12,
  border: '1px solid #ff6b3d',
  background: '#ff6b3d',
  color: '#fdfaf3',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.88rem',
};

const btnGhostStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 12,
  border: '1px solid rgba(15, 92, 84, 0.22)',
  background: 'transparent',
  color: '#0f5c54',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.88rem',
};

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: '#5b6b66',
          textTransform: 'uppercase',
        }}
      >
        {label}
        {required ? <span style={{ color: '#ff6b3d' }}> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid rgba(15, 92, 84, 0.18)',
          background: '#ffffff',
          color: '#1f2a26',
          fontSize: '0.92rem',
        }}
      />
    </label>
  );
}

function FormFieldArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: '#5b6b66',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid rgba(15, 92, 84, 0.18)',
          background: '#ffffff',
          color: '#1f2a26',
          fontSize: '0.92rem',
          lineHeight: 1.55,
          resize: 'vertical',
          minHeight: 90,
        }}
      />
    </label>
  );
}

export default AIMentorAcademyPanel;
