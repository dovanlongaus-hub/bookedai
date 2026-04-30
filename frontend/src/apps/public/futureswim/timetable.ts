import type { CentreCode, DayKey } from './centres';
import type { LevelCode } from './levels';

export type ScheduleSlot = {
  weekday: DayKey;
  start: string;
  end: string;
};

export type TimetableKey = `${CentreCode}-${LevelCode}`;

export type Timetable = Record<TimetableKey, ScheduleSlot[]>;

export const FUTURE_SWIM_TIMETABLE: Timetable = {
  // ---------------- CARINGBAH ----------------
  'caringbah-water-familiarisation': [
    { weekday: 'mon', start: '09:00', end: '09:30' },
    { weekday: 'tue', start: '09:30', end: '10:00' },
    { weekday: 'wed', start: '08:30', end: '09:00' },
    { weekday: 'thu', start: '09:00', end: '09:30' },
    { weekday: 'fri', start: '08:30', end: '09:00' },
    { weekday: 'sat', start: '08:00', end: '08:30' },
  ],
  'caringbah-learn-to-swim': [
    { weekday: 'mon', start: '15:30', end: '16:00' },
    { weekday: 'tue', start: '15:30', end: '16:00' },
    { weekday: 'wed', start: '15:30', end: '16:00' },
    { weekday: 'thu', start: '15:30', end: '16:00' },
    { weekday: 'sat', start: '08:30', end: '09:00' },
    { weekday: 'sat', start: '09:00', end: '09:30' },
  ],
  'caringbah-stroke-correction': [
    { weekday: 'mon', start: '16:30', end: '17:00' },
    { weekday: 'tue', start: '16:30', end: '17:00' },
    { weekday: 'wed', start: '16:30', end: '17:00' },
    { weekday: 'thu', start: '16:30', end: '17:00' },
    { weekday: 'sat', start: '10:00', end: '10:30' },
    { weekday: 'sat', start: '10:30', end: '11:00' },
  ],
  'caringbah-pre-squad': [
    { weekday: 'mon', start: '17:30', end: '18:00' },
    { weekday: 'wed', start: '17:30', end: '18:00' },
    { weekday: 'thu', start: '17:30', end: '18:00' },
    { weekday: 'sat', start: '11:30', end: '12:00' },
  ],

  // ---------------- KIRRAWEE ----------------
  'kirrawee-water-familiarisation': [
    { weekday: 'mon', start: '09:00', end: '09:30' },
    { weekday: 'tue', start: '09:00', end: '09:30' },
    { weekday: 'wed', start: '09:00', end: '09:30' },
    { weekday: 'thu', start: '09:00', end: '09:30' },
    { weekday: 'fri', start: '09:00', end: '09:30' },
    { weekday: 'sat', start: '08:00', end: '08:30' },
    { weekday: 'sun', start: '08:00', end: '08:30' },
  ],
  'kirrawee-learn-to-swim': [
    { weekday: 'mon', start: '15:00', end: '15:30' },
    { weekday: 'tue', start: '15:00', end: '15:30' },
    { weekday: 'wed', start: '15:00', end: '15:30' },
    { weekday: 'thu', start: '15:00', end: '15:30' },
    { weekday: 'fri', start: '15:00', end: '15:30' },
    { weekday: 'sat', start: '09:00', end: '09:30' },
    { weekday: 'sun', start: '09:00', end: '09:30' },
  ],
  'kirrawee-stroke-correction': [
    { weekday: 'mon', start: '16:00', end: '16:30' },
    { weekday: 'tue', start: '16:00', end: '16:30' },
    { weekday: 'wed', start: '16:00', end: '16:30' },
    { weekday: 'thu', start: '16:00', end: '16:30' },
    { weekday: 'fri', start: '16:00', end: '16:30' },
    { weekday: 'sat', start: '10:00', end: '10:30' },
    { weekday: 'sun', start: '10:00', end: '10:30' },
  ],
  'kirrawee-pre-squad': [
    { weekday: 'mon', start: '17:00', end: '17:30' },
    { weekday: 'wed', start: '17:00', end: '17:30' },
    { weekday: 'thu', start: '17:00', end: '17:30' },
    { weekday: 'fri', start: '17:00', end: '17:30' },
    { weekday: 'sat', start: '11:00', end: '11:30' },
  ],

  // ---------------- LEICHHARDT ----------------
  'leichhardt-water-familiarisation': [
    { weekday: 'mon', start: '09:30', end: '10:00' },
    { weekday: 'tue', start: '09:30', end: '10:00' },
    { weekday: 'wed', start: '09:30', end: '10:00' },
    { weekday: 'thu', start: '09:30', end: '10:00' },
    { weekday: 'fri', start: '09:30', end: '10:00' },
    { weekday: 'sat', start: '08:30', end: '09:00' },
    { weekday: 'sun', start: '08:30', end: '09:00' },
  ],
  'leichhardt-learn-to-swim': [
    { weekday: 'mon', start: '15:30', end: '16:00' },
    { weekday: 'tue', start: '15:30', end: '16:00' },
    { weekday: 'wed', start: '15:30', end: '16:00' },
    { weekday: 'thu', start: '15:30', end: '16:00' },
    { weekday: 'fri', start: '15:30', end: '16:00' },
    { weekday: 'sat', start: '09:30', end: '10:00' },
    { weekday: 'sun', start: '09:30', end: '10:00' },
  ],
  'leichhardt-stroke-correction': [
    { weekday: 'mon', start: '16:30', end: '17:00' },
    { weekday: 'tue', start: '16:30', end: '17:00' },
    { weekday: 'wed', start: '16:30', end: '17:00' },
    { weekday: 'thu', start: '16:30', end: '17:00' },
    { weekday: 'fri', start: '16:30', end: '17:00' },
    { weekday: 'sat', start: '13:30', end: '14:00' },
  ],
  'leichhardt-pre-squad': [
    { weekday: 'mon', start: '17:30', end: '18:00' },
    { weekday: 'wed', start: '17:30', end: '18:00' },
    { weekday: 'fri', start: '17:30', end: '18:00' },
    { weekday: 'sat', start: '15:00', end: '15:30' },
  ],

  // ---------------- ROUSE HILL ----------------
  'rouse-hill-water-familiarisation': [
    { weekday: 'wed', start: '09:30', end: '10:00' },
    { weekday: 'fri', start: '09:30', end: '10:00' },
    { weekday: 'sat', start: '08:30', end: '09:00' },
    { weekday: 'sun', start: '08:30', end: '09:00' },
  ],
  'rouse-hill-learn-to-swim': [
    { weekday: 'mon', start: '16:00', end: '16:30' },
    { weekday: 'tue', start: '16:00', end: '16:30' },
    { weekday: 'wed', start: '16:00', end: '16:30' },
    { weekday: 'thu', start: '16:00', end: '16:30' },
    { weekday: 'fri', start: '16:00', end: '16:30' },
    { weekday: 'sat', start: '09:30', end: '10:00' },
    { weekday: 'sun', start: '09:30', end: '10:00' },
  ],
  'rouse-hill-stroke-correction': [
    { weekday: 'mon', start: '17:00', end: '17:30' },
    { weekday: 'tue', start: '17:00', end: '17:30' },
    { weekday: 'wed', start: '17:00', end: '17:30' },
    { weekday: 'thu', start: '17:00', end: '17:30' },
    { weekday: 'fri', start: '17:00', end: '17:30' },
    { weekday: 'sat', start: '13:00', end: '13:30' },
    { weekday: 'sun', start: '13:00', end: '13:30' },
  ],
  'rouse-hill-pre-squad': [
    { weekday: 'mon', start: '19:00', end: '19:30' },
    { weekday: 'wed', start: '19:00', end: '19:30' },
    { weekday: 'fri', start: '19:00', end: '19:30' },
    { weekday: 'sat', start: '14:00', end: '14:30' },
  ],

  // ---------------- ST PETERS ----------------
  'st-peters-water-familiarisation': [
    { weekday: 'mon', start: '09:30', end: '10:00' },
    { weekday: 'tue', start: '09:30', end: '10:00' },
    { weekday: 'wed', start: '09:30', end: '10:00' },
    { weekday: 'thu', start: '09:30', end: '10:00' },
    { weekday: 'fri', start: '09:30', end: '10:00' },
    { weekday: 'sat', start: '08:00', end: '08:30' },
    { weekday: 'sun', start: '08:00', end: '08:30' },
  ],
  'st-peters-learn-to-swim': [
    { weekday: 'mon', start: '15:30', end: '16:00' },
    { weekday: 'tue', start: '15:30', end: '16:00' },
    { weekday: 'wed', start: '15:30', end: '16:00' },
    { weekday: 'thu', start: '15:30', end: '16:00' },
    { weekday: 'fri', start: '15:30', end: '16:00' },
    { weekday: 'sat', start: '09:30', end: '10:00' },
    { weekday: 'sun', start: '09:30', end: '10:00' },
  ],
  'st-peters-stroke-correction': [
    { weekday: 'mon', start: '16:30', end: '17:00' },
    { weekday: 'tue', start: '16:30', end: '17:00' },
    { weekday: 'wed', start: '16:30', end: '17:00' },
    { weekday: 'thu', start: '16:30', end: '17:00' },
    { weekday: 'fri', start: '16:30', end: '17:00' },
    { weekday: 'sat', start: '13:00', end: '13:30' },
    { weekday: 'sun', start: '13:00', end: '13:30' },
  ],
  'st-peters-pre-squad': [
    { weekday: 'mon', start: '17:30', end: '18:00' },
    { weekday: 'wed', start: '17:30', end: '18:00' },
    { weekday: 'fri', start: '17:30', end: '18:00' },
    { weekday: 'sat', start: '14:00', end: '14:30' },
  ],
};

export function getSlotsFor(centre: CentreCode, level: LevelCode): ScheduleSlot[] {
  const key = `${centre}-${level}` as TimetableKey;
  return FUTURE_SWIM_TIMETABLE[key] ?? [];
}
