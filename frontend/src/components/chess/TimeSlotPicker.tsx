import { useEffect, useState } from 'react';

import { apiV1, type ChessCourseSlot } from '../../shared/api/v1';

export type TimeSlotPickerLocale = 'en' | 'vi';

export interface TimeSlotPickerDictionary {
  heading: string;
  hint: string;
  loading: string;
  empty: string;
  error: string;
  retry: string;
  spotsLeft: (count: number) => string;
  spotsLast: (count: number) => string;
  selected: string;
}

interface TimeSlotPickerProps {
  locale: TimeSlotPickerLocale;
  dict: TimeSlotPickerDictionary;
  serviceId: string | null;
  selectedSlotId: string;
  onSelect: (slot: ChessCourseSlot | null) => void;
}

function buildLookaheadRange() {
  const today = new Date();
  const to = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(today), to: fmt(to) };
}

function formatSlotDate(slot: ChessCourseSlot, locale: TimeSlotPickerLocale): string {
  const dateText = slot.date || slot.starts_at;
  if (!dateText) return '—';
  const parsed = new Date(dateText);
  if (Number.isNaN(parsed.getTime())) return dateText;
  try {
    return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(parsed);
  } catch {
    return dateText;
  }
}

function formatSlotTime(slot: ChessCourseSlot, locale: TimeSlotPickerLocale): string {
  if (slot.start_time) return slot.start_time;
  if (!slot.starts_at) return '';
  const parsed = new Date(slot.starts_at);
  if (Number.isNaN(parsed.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  } catch {
    return '';
  }
}

export function TimeSlotPicker({
  locale,
  dict,
  serviceId,
  selectedSlotId,
  onSelect,
}: TimeSlotPickerProps) {
  const [slots, setSlots] = useState<ChessCourseSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!serviceId) {
      setSlots([]);
      setLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setError(null);
    const range = buildLookaheadRange();
    void (async () => {
      try {
        const response = await apiV1.chessCourseSlots(serviceId, {
          from: range.from,
          to: range.to,
          limit: 12,
        });
        if (cancelled) return;
        if ('data' in response && Array.isArray(response.data.slots)) {
          setSlots(response.data.slots);
        } else {
          setSlots([]);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : dict.error);
        setSlots([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dict.error, serviceId]);

  const handleRetry = () => {
    if (!serviceId) return;
    setError(null);
    setLoading(true);
    const range = buildLookaheadRange();
    void apiV1
      .chessCourseSlots(serviceId, { from: range.from, to: range.to, limit: 12 })
      .then((response) => {
        if ('data' in response && Array.isArray(response.data.slots)) {
          setSlots(response.data.slots);
        } else {
          setSlots([]);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : dict.error);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="chess-slot-picker" aria-label={dict.heading}>
      <div>
        <h3 className="chess-slot-picker__heading">{dict.heading}</h3>
        <p className="chess-slot-picker__hint">{dict.hint}</p>
      </div>

      {loading ? (
        <div className="chess-slot-empty" role="status">
          {dict.loading}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="chess-slot-empty" role="alert">
          <span>{error}</span>
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={handleRetry}
              className="chess-btn chess-btn-sm chess-btn-outline"
            >
              {dict.retry}
            </button>
          </div>
        </div>
      ) : null}

      {!loading && !error && slots.length === 0 ? (
        <div className="chess-slot-empty">{dict.empty}</div>
      ) : null}

      {!loading && !error && slots.length > 0 ? (
        <ul className="chess-slot-list" role="listbox" aria-label={dict.heading}>
          {slots.map((slot) => {
            const selected = selectedSlotId === slot.slot_id;
            const lowSpots = slot.spots_left > 0 && slot.spots_left <= 2;
            return (
              <li key={slot.slot_id}>
                <button
                  type="button"
                  className="chess-slot-card"
                  aria-pressed={selected}
                  onClick={() => onSelect(selected ? null : slot)}
                >
                  <span className="chess-slot-card__date">{formatSlotDate(slot, locale)}</span>
                  <span className="chess-slot-card__time">{formatSlotTime(slot, locale)}</span>
                  {slot.cohort_label ? (
                    <span className="chess-slot-card__cohort">{slot.cohort_label}</span>
                  ) : null}
                  {slot.spots_left > 0 ? (
                    <span
                      className={`chess-slot-card__spots${
                        lowSpots ? ' chess-slot-card__spots--low' : ''
                      }`}
                    >
                      {lowSpots
                        ? dict.spotsLast(slot.spots_left)
                        : dict.spotsLeft(slot.spots_left)}
                    </span>
                  ) : null}
                  {selected ? (
                    <span className="chess-slot-card__selected" aria-hidden="true">
                      ✓ {dict.selected}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
