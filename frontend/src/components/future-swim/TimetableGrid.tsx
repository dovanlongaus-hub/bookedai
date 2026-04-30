import { Clock, Users, Droplet } from 'lucide-react';

import type { CentreCode } from '../../apps/public/futureswim/centres';
import { DAY_LABELS, DAY_ORDER, getCentre } from '../../apps/public/futureswim/centres';
import type { LevelCode } from '../../apps/public/futureswim/levels';
import { getLevel } from '../../apps/public/futureswim/levels';
import { getSlotsFor } from '../../apps/public/futureswim/timetable';

type TimetableGridProps = {
  centre: CentreCode;
  level: LevelCode;
  priceLabel?: string | null;
};

export function TimetableGrid({ centre, level, priceLabel }: TimetableGridProps) {
  const centreInfo = getCentre(centre);
  const levelInfo = getLevel(level);
  const slots = getSlotsFor(centre, level);

  const slotsByDay = DAY_ORDER.reduce<Record<string, typeof slots>>((accumulator, day) => {
    accumulator[day] = slots.filter((slot) => slot.weekday === day);
    return accumulator;
  }, {});

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {levelInfo ? (
          <>
            <span className="fs-chip">
              <Users size={14} aria-hidden="true" />
              Class size: {levelInfo.classSize}
            </span>
            <span className="fs-chip-warm fs-chip">
              <Clock size={14} aria-hidden="true" />
              Age band: {levelInfo.ageBand}
            </span>
            {levelInfo.parentInWater ? (
              <span className="fs-chip-coral fs-chip">
                <Droplet size={14} aria-hidden="true" />
                Parent in water
              </span>
            ) : (
              <span className="fs-chip-neutral fs-chip">Independent class</span>
            )}
          </>
        ) : null}
        {priceLabel ? <span className="fs-chip">{priceLabel}</span> : null}
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="fs-timetable">
            {DAY_ORDER.map((day) => (
              <div key={`head-${day}`} className="fs-timetable-head">
                {DAY_LABELS[day].slice(0, 3)}
              </div>
            ))}
            {DAY_ORDER.map((day) => {
              const daySlots = slotsByDay[day];
              if (!daySlots || !daySlots.length) {
                return (
                  <div key={`cell-${day}`} className="fs-timetable-cell fs-empty" aria-label={`${DAY_LABELS[day]}: no classes`}>
                    &mdash;
                  </div>
                );
              }
              return (
                <div key={`cell-${day}`} className="fs-timetable-cell">
                  {daySlots.map((slot) => (
                    <span key={`${day}-${slot.start}`} className="fs-timetable-slot">
                      {slot.start}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {centreInfo ? (
        <p className="mt-4 text-xs text-[color:var(--fs-text-soft)]">
          Times shown are 30-minute lessons in Australia/Sydney time at {centreInfo.name}. Schedules
          can change at short notice — confirm your slot before your first lesson.
        </p>
      ) : null}
    </div>
  );
}
