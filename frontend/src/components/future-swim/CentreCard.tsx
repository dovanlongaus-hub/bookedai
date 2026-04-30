import { useState } from 'react';
import { MapPin, Phone, Mail, MessageCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';

import type { Centre, DayKey } from '../../apps/public/futureswim/centres';
import { DAY_LABELS, DAY_ORDER } from '../../apps/public/futureswim/centres';

type CentreCardProps = {
  centre: Centre;
  priceLabel: string;
  whatsappHref: string;
  telegramHref: string;
};

function formatWindow(label: string, value: string | null) {
  if (!value) return null;
  return (
    <span>
      <span className="text-[color:var(--fs-text-soft)]">{label}:</span> {value}
    </span>
  );
}

function formatDayHours(centre: Centre, day: DayKey) {
  const window = centre.openingHours[day];
  if (!window.morning && !window.afternoon) return 'Closed';
  return [
    window.morning ? window.morning : null,
    window.afternoon ? window.afternoon : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function CentreCard({ centre, priceLabel, whatsappHref, telegramHref }: CentreCardProps) {
  const [hoursOpen, setHoursOpen] = useState(false);

  return (
    <article className="fs-card flex h-full flex-col overflow-hidden p-0">
      <div className="relative h-44 w-full overflow-hidden bg-[color:var(--fs-primary-tint)]">
        <img
          src={centre.imageUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(3,105,161,0) 50%, rgba(3,105,161,0.55) 100%)',
          }}
        />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-white/85">
              Future Swim
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-white">{centre.name}</h3>
          </div>
          <span className="fs-chip-coral fs-chip">{priceLabel}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6 sm:p-7">
        <div className="space-y-2 text-sm leading-6 text-[color:var(--fs-text)]">
          <div className="flex items-start gap-2">
            <MapPin size={16} aria-hidden="true" className="mt-1 flex-none text-[color:var(--fs-primary-dark)]" />
            <span>{centre.address}</span>
          </div>
          <div className="text-[color:var(--fs-text-muted)]">
            <span className="font-semibold text-[color:var(--fs-text)]">Manager:</span> {centre.manager}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`tel:${centre.phone}`}
            className="fs-button-ghost"
            aria-label={`Call ${centre.name}`}
          >
            <Phone size={14} aria-hidden="true" />
            {centre.phoneDisplay}
          </a>
          <a
            href={`mailto:${centre.email}`}
            className="fs-button-ghost"
            aria-label={`Email ${centre.name}`}
          >
            <Mail size={14} aria-hidden="true" />
            Email
          </a>
          <a
            href={centre.mapUrl}
            target="_blank"
            rel="noreferrer"
            className="fs-button-ghost"
            aria-label={`Open Google Maps for ${centre.name}`}
          >
            <MapPin size={14} aria-hidden="true" />
            Google Maps
          </a>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setHoursOpen((current) => !current)}
            aria-expanded={hoursOpen}
            className="fs-button-ghost w-full justify-between"
          >
            <span>Opening hours</span>
            {hoursOpen ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
          </button>
          {hoursOpen ? (
            <ul className="mt-3 space-y-2 rounded-[var(--fs-radius-sm)] border border-[color:var(--fs-border)] bg-[color:var(--fs-surface-soft)] p-4 text-sm">
              {DAY_ORDER.map((day) => (
                <li key={day} className="flex justify-between gap-3">
                  <span className="font-semibold text-[color:var(--fs-text)]">{DAY_LABELS[day]}</span>
                  <span className="text-[color:var(--fs-text-muted)]">
                    {formatDayHours(centre, day)}
                    <span className="sr-only">
                      {formatWindow('morning', centre.openingHours[day].morning)}
                      {formatWindow('afternoon', centre.openingHours[day].afternoon)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="fs-sticky-button fs-sticky-whatsapp"
            aria-label={`WhatsApp Future Swim about ${centre.name}`}
            style={{ minHeight: 40, padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <MessageCircle size={16} aria-hidden="true" />
            <span>WhatsApp</span>
          </a>
          <a
            href={telegramHref}
            target="_blank"
            rel="noreferrer"
            className="fs-sticky-button fs-sticky-telegram"
            aria-label={`Telegram Future Swim about ${centre.name}`}
            style={{ minHeight: 40, padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <Send size={16} aria-hidden="true" />
            <span>Telegram</span>
          </a>
        </div>

        <div className="text-[0.72rem] text-[color:var(--fs-text-soft)]">
          Source:{' '}
          <a href={centre.sourceUrl} target="_blank" rel="noreferrer" className="underline">
            futureswim.com.au/locations/{centre.code}
          </a>
        </div>
      </div>
    </article>
  );
}
