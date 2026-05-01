import React, { useEffect, useMemo, useState } from 'react';

export interface SlotGridCompactSlot {
  slot_id?: string | null;
  starts_at: string;
  duration_minutes: number;
  timezone?: string;
  status?: 'open' | 'full' | 'cancelled';
}

export interface SlotGridCompactProps {
  slots: SlotGridCompactSlot[];
  selectedStartsAt?: string | null;
  onSelect: (slot: SlotGridCompactSlot) => void;
  locale?: 'en' | 'vi';
  next7DaysOnly?: boolean;
  emptyLabel?: string;
  testId?: string;
}

interface DateBucket {
  iso: string;
  dow: string;
  dayNum: string;
  slots: SlotGridCompactSlot[];
}

const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const userTz = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

const isoDateInTz = (iso: string, tz: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
};

const formatTime = (iso: string, tz: string, locale: 'en' | 'vi'): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

export const SlotGridCompact: React.FC<SlotGridCompactProps> = ({
  slots,
  selectedStartsAt,
  onSelect,
  locale = 'en',
  next7DaysOnly = false,
  emptyLabel,
  testId,
}) => {
  const tz = useMemo(() => userTz(), []);
  const dowLabels = locale === 'vi' ? DOW_VI : DOW_EN;

  const dateBuckets = useMemo<DateBucket[]>(() => {
    const map = new Map<string, SlotGridCompactSlot[]>();
    for (const s of slots) {
      if (!s.starts_at) continue;
      const iso = isoDateInTz(s.starts_at, tz);
      const arr = map.get(iso) ?? [];
      arr.push(s);
      map.set(iso, arr);
    }
    let entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    if (next7DaysOnly) {
      const today = isoDateInTz(new Date().toISOString(), tz);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + 7);
      const cutoff = isoDateInTz(cutoffDate.toISOString(), tz);
      entries = entries.filter(([iso]) => iso >= today && iso <= cutoff);
    }
    return entries.map(([iso, items]) => {
      const sample = new Date(items[0].starts_at);
      const weekdayShort = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' })
        .formatToParts(sample)
        .find((p) => p.type === 'weekday')?.value ?? 'Sun';
      const dowIdx = Math.max(0, DOW_EN.indexOf(weekdayShort));
      const dayNum = new Intl.DateTimeFormat('en-US', { timeZone: tz, day: 'numeric' }).format(sample);
      const sortedSlots = [...items].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      return { iso, dow: dowLabels[dowIdx] ?? '', dayNum, slots: sortedSlots };
    });
  }, [slots, tz, next7DaysOnly, dowLabels]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDate && dateBuckets.some((b) => b.iso === selectedDate)) return;
    const firstWithOpen = dateBuckets.find((b) => b.slots.some((s) => (s.status ?? 'open') === 'open'));
    setSelectedDate(firstWithOpen?.iso ?? dateBuckets[0]?.iso ?? null);
  }, [dateBuckets, selectedDate]);

  if (slots.length === 0) {
    return (
      <div data-testid={testId} style={{ padding: '12px 4px', opacity: 0.7, fontSize: 13 }}>
        {locale === 'vi' ? 'Chưa có buổi nào sắp tới' : 'No upcoming sessions'}
      </div>
    );
  }

  const activeBucket = dateBuckets.find((b) => b.iso === selectedDate);
  const noOpenLabel =
    emptyLabel ??
    (locale === 'vi' ? 'Không còn giờ — chọn ngày khác' : 'No times available — pick another day');
  const hasOpen = activeBucket?.slots.some((s) => (s.status ?? 'open') === 'open') ?? false;

  return (
    <div data-testid={testId}>
      <div
        className="aim-slot-dates"
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          padding: '4px 2px 12px',
          scrollSnapType: 'x mandatory',
        }}
      >
        {dateBuckets.map((d) => (
          <button
            key={d.iso}
            type="button"
            className="aim-slot"
            data-selected={selectedDate === d.iso}
            style={{ minWidth: 64, scrollSnapAlign: 'start' }}
            onClick={() => setSelectedDate(d.iso)}
          >
            <span style={{ display: 'block', fontSize: 11, opacity: 0.7 }}>{d.dow}</span>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>{d.dayNum}</span>
          </button>
        ))}
      </div>
      {activeBucket && hasOpen ? (
        <div className="aim-slot-grid">
          {activeBucket.slots.map((s) => {
            const status = s.status ?? 'open';
            const disabled = status !== 'open';
            return (
              <button
                key={`${s.starts_at}-${s.slot_id ?? ''}`}
                type="button"
                className="aim-slot"
                data-selected={selectedStartsAt === s.starts_at}
                data-status={status}
                disabled={disabled}
                style={disabled ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } : undefined}
                onClick={() => onSelect(s)}
              >
                {formatTime(s.starts_at, tz, locale)}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '12px 4px', opacity: 0.7, fontSize: 13 }}>{noOpenLabel}</div>
      )}
    </div>
  );
};

export default SlotGridCompact;
