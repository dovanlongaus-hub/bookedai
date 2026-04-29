/**
 * AI Mentor Reservations panel — tenant-side view of every booked slot.
 *
 * Backend endpoints (registered via tenant_ai_mentor_progress_router):
 *   GET   /api/v1/tenants/me/aimentor-reservations
 *   PATCH /api/v1/tenants/me/aimentor-reservations/{slot_id}/action
 *
 * The mentor sees upcoming + past_due + completed + cancelled, can click
 * the Zoho Meeting URL to join, mark a session "complete" or "cancel",
 * and append free-text mentor notes. Cancelling decrements the slot's
 * booked_count so the seat becomes available again.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

type ReservationStatus = 'upcoming' | 'past_due' | 'completed' | 'cancelled';

type Reservation = {
  slot_id: string;
  service_id: string;
  service_name: string | null;
  slot_start_at: string;
  slot_end_at: string;
  timezone: string;
  label: string | null;
  capacity: number;
  booked_count: number;
  learner: {
    email: string | null;
    name: string | null;
    phone: string | null;
    locale: string | null;
  };
  booking_reference: string | null;
  reserved_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  mentor_notes: string | null;
  status: ReservationStatus;
  zoho: {
    meeting_url: string | null;
    calendar_event_id: string | null;
  };
};

type ReservationsResponse = {
  status?: string;
  data?: { reservations: Reservation[] };
  error?: { message?: string };
};

type ActionResponse = {
  status?: string;
  data?: {
    slot_id: string;
    completed_at: string | null;
    cancelled_at: string | null;
    mentor_notes: string | null;
    booked_count: number;
    action: string;
  };
  error?: { message?: string };
};

const dict = {
  en: {
    title: 'AI Mentor reservations',
    lead: 'Every booked slot — click the Zoho link to join, mark complete after the session, or cancel to free the seat.',
    refresh: 'Refresh',
    loading: 'Loading reservations…',
    empty: 'No reservations yet. They appear here as soon as a learner reserves a slot.',
    loadError: 'Could not load reservations. Try refreshing.',
    columnLearner: 'Learner',
    columnSlot: 'Slot (Sydney)',
    columnProgram: 'Program',
    columnRef: 'Reference',
    columnStatus: 'Status',
    columnZoho: 'Zoho Meeting',
    columnActions: 'Actions',
    statusUpcoming: 'Upcoming',
    statusPastDue: 'Needs follow-up',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    openMeeting: 'Join',
    noMeeting: '—',
    actionComplete: 'Mark complete',
    actionCancel: 'Cancel',
    actionNote: 'Add note',
    saving: 'Saving…',
    notesPlaceholder: 'Mentor notes (optional) — e.g. "Showed up, shipped first AI app, follow up next week"',
    saveError: 'Could not save. Try again.',
    saved: 'Saved.',
  },
  vi: {
    title: 'AI Mentor — Lịch đặt chỗ',
    lead: 'Mọi slot đã có học viên đặt — bấm link Zoho để join, đánh dấu hoàn tất sau buổi học, hoặc huỷ để giải phóng slot.',
    refresh: 'Làm mới',
    loading: 'Đang tải…',
    empty: 'Chưa có ai đặt chỗ. Sẽ hiện ra ngay khi có học viên đặt slot.',
    loadError: 'Không tải được. Vui lòng làm mới.',
    columnLearner: 'Học viên',
    columnSlot: 'Slot (Sydney)',
    columnProgram: 'Chương trình',
    columnRef: 'Mã booking',
    columnStatus: 'Trạng thái',
    columnZoho: 'Zoho Meeting',
    columnActions: 'Hành động',
    statusUpcoming: 'Sắp tới',
    statusPastDue: 'Cần follow-up',
    statusCompleted: 'Đã hoàn tất',
    statusCancelled: 'Đã huỷ',
    openMeeting: 'Tham gia',
    noMeeting: '—',
    actionComplete: 'Đánh dấu hoàn tất',
    actionCancel: 'Huỷ',
    actionNote: 'Thêm ghi chú',
    saving: 'Đang lưu…',
    notesPlaceholder: 'Ghi chú mentor (tuỳ chọn) — VD: "Đã đến, ship app AI đầu tiên, follow up tuần sau"',
    saveError: 'Không lưu được. Vui lòng thử lại.',
    saved: 'Đã lưu.',
  },
} as const;

type Locale = 'en' | 'vi';

export type AIMentorReservationsPanelProps = {
  sessionToken: string | null;
  locale?: Locale;
  className?: string;
};

export function AIMentorReservationsPanel({
  sessionToken,
  locale,
  className,
}: AIMentorReservationsPanelProps) {
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

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(resolvedLocale === 'vi' ? 'vi-VN' : 'en-AU', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Australia/Sydney',
      }),
    [resolvedLocale],
  );

  const load = useCallback(async () => {
    if (!sessionToken) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/v1/tenants/me/aimentor-reservations', {
        method: 'GET',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const payload = (await res.json().catch(() => null)) as ReservationsResponse | null;
      if (!res.ok || !payload || payload.status !== 'ok' || !payload.data) {
        setLoadError(payload?.error?.message || t.loadError);
        return;
      }
      setReservations(payload.data.reservations);
    } catch {
      setLoadError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [sessionToken, t.loadError]);

  useEffect(() => {
    if (sessionToken) void load();
  }, [sessionToken, load]);

  const submitAction = useCallback(
    async (slotId: string, action: 'complete' | 'cancel' | 'note', notes: string | null) => {
      if (!sessionToken) return;
      setSavingAction(`${slotId}:${action}`);
      setActionError(null);
      try {
        const res = await fetch(
          `/api/v1/tenants/me/aimentor-reservations/${encodeURIComponent(slotId)}/action`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({ action, mentor_notes: notes }),
          },
        );
        const payload = (await res.json().catch(() => null)) as ActionResponse | null;
        if (!res.ok || !payload || payload.status !== 'ok') {
          setActionError(payload?.error?.message || t.saveError);
          return;
        }
        setSavedToast(t.saved);
        setOpenSlotId(null);
        setNotesDraft('');
        void load();
      } catch {
        setActionError(t.saveError);
      } finally {
        setSavingAction(null);
      }
    },
    [sessionToken, t.saveError, t.saved, load],
  );

  if (!sessionToken) {
    return (
      <div className={className} style={{ padding: 22 }}>
        <p style={{ fontSize: '0.95rem', color: '#5b6b66' }}>
          Sign in with your AI Mentor tenant Google account to view reservations.
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
              fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#ff6b3d',
            }}
          >
            ai-mentor-doer · reservations
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
              maxWidth: 640,
              lineHeight: 1.6,
            }}
          >
            {t.lead}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
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
              <th style={cellHeader}>{t.columnLearner}</th>
              <th style={cellHeader}>{t.columnSlot}</th>
              <th style={cellHeader}>{t.columnProgram}</th>
              <th style={cellHeader}>{t.columnRef}</th>
              <th style={cellHeader}>{t.columnStatus}</th>
              <th style={cellHeader}>{t.columnZoho}</th>
              <th style={cellHeader}>{t.columnActions}</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={7}
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

            {reservations.map((r) => {
              const isOpen = openSlotId === r.slot_id;
              const statusInfo = statusBadge(r.status, t);
              return (
                <>
                  <tr
                    key={r.slot_id}
                    style={{
                      borderTop: '1px solid rgba(15, 92, 84, 0.1)',
                      opacity: r.status === 'cancelled' ? 0.6 : 1,
                    }}
                  >
                    <td style={cellBody}>
                      <strong style={{ color: '#061614' }}>{r.learner.name || '—'}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#5b6b66', marginTop: 2 }}>{r.learner.email}</div>
                      {r.learner.phone ? <div style={{ fontSize: '0.76rem', color: '#5b6b66' }}>{r.learner.phone}</div> : null}
                    </td>
                    <td style={cellBody}>
                      <strong style={{ color: '#061614' }}>{dateFmt.format(new Date(r.slot_start_at))}</strong>
                      {r.label ? (
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '0.7rem',
                            color: '#0f5c54',
                            marginTop: 4,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {r.label}
                        </div>
                      ) : null}
                    </td>
                    <td style={cellBody}>{r.service_name || r.service_id}</td>
                    <td style={cellBody}>
                      {r.booking_reference ? (
                        <code
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '0.78rem',
                            background: 'rgba(20, 160, 146, 0.08)',
                            color: '#0f5c54',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {r.booking_reference}
                        </code>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={cellBody}>
                      <span
                        style={{
                          display: 'inline-flex',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          background: statusInfo.background,
                          color: statusInfo.color,
                          border: `1px solid ${statusInfo.borderColor}`,
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td style={cellBody}>
                      {r.zoho.meeting_url ? (
                        <a
                          href={r.zoho.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: '#0f5c54',
                            fontWeight: 600,
                            textDecoration: 'none',
                            fontSize: '0.84rem',
                          }}
                        >
                          {t.openMeeting} →
                        </a>
                      ) : (
                        <span style={{ color: '#5b6b66' }}>{t.noMeeting}</span>
                      )}
                    </td>
                    <td style={cellBody}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {r.status !== 'completed' && r.status !== 'cancelled' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void submitAction(r.slot_id, 'complete', null)}
                              disabled={savingAction === `${r.slot_id}:complete`}
                              style={btnPrimary}
                            >
                              {savingAction === `${r.slot_id}:complete` ? t.saving : t.actionComplete}
                            </button>
                            <button
                              type="button"
                              onClick={() => void submitAction(r.slot_id, 'cancel', null)}
                              disabled={savingAction === `${r.slot_id}:cancel`}
                              style={btnGhost}
                            >
                              {t.actionCancel}
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            if (isOpen) {
                              setOpenSlotId(null);
                              setNotesDraft('');
                            } else {
                              setOpenSlotId(r.slot_id);
                              setNotesDraft(r.mentor_notes ?? '');
                            }
                          }}
                          style={btnGhost}
                        >
                          {isOpen ? '×' : t.actionNote}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr key={`${r.slot_id}-notes`}>
                      <td colSpan={7} style={{ padding: 16, background: '#fdfaf3', borderTop: '1px solid rgba(15, 92, 84, 0.08)' }}>
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          rows={3}
                          placeholder={t.notesPlaceholder}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: '1px solid rgba(15, 92, 84, 0.18)',
                            background: '#ffffff',
                            color: '#1f2a26',
                            fontSize: '0.92rem',
                            lineHeight: 1.55,
                            resize: 'vertical',
                            fontFamily: 'inherit',
                          }}
                        />
                        {actionError ? (
                          <div role="alert" style={{ color: '#c0392b', fontSize: '0.84rem', marginTop: 8 }}>
                            {actionError}
                          </div>
                        ) : null}
                        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => void submitAction(r.slot_id, 'note', notesDraft)}
                            disabled={savingAction === `${r.slot_id}:note`}
                            style={btnPrimary}
                          >
                            {savingAction === `${r.slot_id}:note` ? t.saving : t.actionNote}
                          </button>
                        </div>
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

function statusBadge(status: ReservationStatus, t: (typeof dict)[Locale]) {
  switch (status) {
    case 'upcoming':
      return {
        label: t.statusUpcoming,
        background: 'rgba(20, 160, 146, 0.12)',
        color: '#0f5c54',
        borderColor: 'rgba(20, 160, 146, 0.3)',
      };
    case 'past_due':
      return {
        label: t.statusPastDue,
        background: 'rgba(255, 107, 61, 0.14)',
        color: '#e84e1e',
        borderColor: 'rgba(255, 107, 61, 0.32)',
      };
    case 'completed':
      return {
        label: t.statusCompleted,
        background: 'rgba(47, 158, 117, 0.12)',
        color: '#2f9e75',
        borderColor: 'rgba(47, 158, 117, 0.32)',
      };
    case 'cancelled':
      return {
        label: t.statusCancelled,
        background: 'rgba(91, 107, 102, 0.12)',
        color: '#5b6b66',
        borderColor: 'rgba(91, 107, 102, 0.3)',
      };
    default:
      return {
        label: status,
        background: 'rgba(91, 107, 102, 0.08)',
        color: '#5b6b66',
        borderColor: 'rgba(91, 107, 102, 0.18)',
      };
  }
}

const cellHeader: React.CSSProperties = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: '0.7rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#5b6b66',
  fontWeight: 700,
  fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
};

const cellBody: React.CSSProperties = {
  padding: '14px 14px',
  fontSize: '0.9rem',
  color: '#1f2a26',
  verticalAlign: 'top',
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid #ff6b3d',
  background: '#ff6b3d',
  color: '#fdfaf3',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.82rem',
};

const btnGhost: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid rgba(15, 92, 84, 0.22)',
  background: 'transparent',
  color: '#0f5c54',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.82rem',
};

export default AIMentorReservationsPanel;
