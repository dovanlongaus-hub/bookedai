type CalendarEventInput = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  url?: string;
  startsAt: Date;
  endsAt?: Date;
  durationMinutes?: number;
  organizerEmail?: string;
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function toIcsDate(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildIcsContent(event: CalendarEventInput): string {
  const start = event.startsAt;
  const end =
    event.endsAt ??
    new Date(start.getTime() + (event.durationMinutes ?? 60) * 60 * 1000);
  const now = new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BookedAI//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}@bookedai.au`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
  ];
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcs(event.location)}`);
  }
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }
  if (event.organizerEmail) {
    lines.push(`ORGANIZER:mailto:${event.organizerEmail}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR', '');
  return lines.join('\r\n');
}

export function downloadIcsFile(filename: string, content: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseBookingDateTime(
  isoOrDateOnly: string,
  time?: string,
  timezoneHint?: string,
): Date | null {
  if (!isoOrDateOnly) {
    return null;
  }
  const direct = new Date(isoOrDateOnly);
  if (!Number.isNaN(direct.getTime()) && isoOrDateOnly.includes('T')) {
    return direct;
  }
  if (time) {
    const composed = new Date(`${isoOrDateOnly}T${time}${timezoneHint ?? ''}`);
    if (!Number.isNaN(composed.getTime())) {
      return composed;
    }
  }
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }
  return null;
}
