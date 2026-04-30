import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Waves, MapPin, Clock, Droplet, Users, ArrowRight } from 'lucide-react';

import '../../theme/future-swim-tokens.css';

import { createPublicBookingAssistantLeadAndBookingIntent } from '../../components/landing/assistant/publicBookingAssistantV1';
import { apiV1 } from '../../shared/api/v1';
import type { MatchCandidate } from '../../shared/contracts';

import { CentreCard } from '../../components/future-swim/CentreCard';
import { FutureSwimAsk } from '../../components/future-swim/FutureSwimAsk';
import { FutureSwimHeader } from '../../components/future-swim/FutureSwimHeader';
import { LevelCard } from '../../components/future-swim/LevelCard';
import { StickyChatCtas } from '../../components/future-swim/StickyChatCtas';
import { TimetableGrid } from '../../components/future-swim/TimetableGrid';

import {
  FUTURE_SWIM_CENTRES,
  type Centre,
  type CentreCode,
} from './futureswim/centres';
import {
  FUTURE_SWIM_LEVELS,
  parseLevelCode,
  type LevelCode,
} from './futureswim/levels';

type BookingAssistantCatalogResponse = {
  status?: string;
  business_email?: string | null;
  stripe_enabled?: boolean;
  services?: Array<{
    id?: string;
    name?: string;
    category?: string | null;
    summary?: string | null;
    amount_aud?: number | null;
    display_price?: string | null;
    location?: string | null;
    venue_name?: string | null;
    booking_url?: string | null;
    map_url?: string | null;
    source_url?: string | null;
    image_url?: string | null;
    featured?: boolean;
    tags?: string[] | null;
  }>;
};

type ServiceRow = MatchCandidate & {
  centreCode: CentreCode | null;
  levelCode: LevelCode | null;
};

type LevelOfferingKey = `${CentreCode}-${LevelCode}`;

type InquiryFormState = {
  parentName: string;
  email: string;
  phone: string;
  childAge: string;
  confidenceLevel: string;
  preferredDate: string;
  preferredTime: string;
  centreCode: CentreCode;
  levelCode: LevelCode;
  notes: string;
};

const FUTURE_SWIM_TENANT_REF = 'future-swim';
const DEFAULT_SOURCE_PAGE = 'future-swim-runtime';

const WHATSAPP_HREF =
  'https://wa.me/61455301335?text=Hi%20Future%20Swim%2C%20I%27d%20like%20to%20book%20a%20lesson.';
const TELEGRAM_HREF = 'https://t.me/BookedAI_Manager_Bot?start=futureswim';

const TRUST_SIGNALS = [
  'Warm ozone-treated pools',
  'Max 3 in beginner classes',
  'Make-up lessons available',
];

const FAQS: Array<{ question: string; answer: string }> = [
  {
    question: 'Do you offer make-up lessons?',
    answer:
      'Yes. If you give your centre advance notice and a slot is available, missed lessons can be made up at any Future Swim centre. Speak to your centre manager or send a message via Future Swim Ask.',
  },
  {
    question: 'Is there a sibling discount?',
    answer:
      'Future Swim runs ongoing promotions for second-and-third children. Pricing varies by centre — ask your local centre or send a quick note via WhatsApp and we will confirm what is current.',
  },
  {
    question: 'What should my child bring?',
    answer:
      'A swimsuit, two towels, goggles (optional for first lessons), and warm clothing for after the lesson. Babies should wear a leak-proof reusable swim nappy. Showers are available at every centre.',
  },
  {
    question: 'Is a free trial available at St Peters?',
    answer:
      'Yes — the St Peters centre offers a complimentary trial lesson for new families. Book through Future Swim Ask, WhatsApp, or by calling the centre directly.',
  },
  {
    question: 'Why ozone instead of chlorine?',
    answer:
      'Future Swim pools use ozone-treated water alongside a low residual sanitiser. The water is gentler on skin, eyes, and swimsuits than traditional high-chlorine pools, while still meeting NSW Health pool-water standards.',
  },
  {
    question: 'What happens if my child cries during the lesson?',
    answer:
      'Tears in the first few lessons are normal — our coaches are trained to build trust at the child\'s pace. We will keep you fully briefed at the pool deck and, with your permission, slow the lesson down or step back to comfort skills before progressing.',
  },
];

const initialInquiryFormState: InquiryFormState = {
  parentName: '',
  email: '',
  phone: '',
  childAge: '4',
  confidenceLevel: 'Nervous beginner',
  preferredDate: '',
  preferredTime: '',
  centreCode: 'caringbah',
  levelCode: 'learn-to-swim',
  notes: '',
};

function buildAttribution() {
  if (typeof window === 'undefined') {
    return {
      source: 'futureswim.bookedai.au',
      medium: 'web',
      landing_path: '/futureswim',
      referrer: null,
    };
  }
  return {
    source: 'futureswim.bookedai.au',
    medium: 'web',
    landing_path: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || null,
  };
}

function buildActorContext() {
  return {
    channel: 'public_web' as const,
    deployment_mode: 'standalone_app' as const,
    tenant_ref: FUTURE_SWIM_TENANT_REF,
  };
}

function buildRuntimeConfig() {
  return {
    tenantRef: FUTURE_SWIM_TENANT_REF,
    channel: 'public_web' as const,
    deploymentMode: 'standalone_app' as const,
    source: 'futureswim.bookedai.au',
    widgetId: 'future-swim-concierge',
  };
}

function formatPrice(price?: string | null, amount?: number | null) {
  if (price && price.trim()) return price.trim();
  if (typeof amount === 'number' && amount > 0.01) {
    return `A$${amount.toFixed(Number.isInteger(amount) ? 0 : 2)}`;
  }
  return 'Please enquire';
}

function parseCentreCode(serviceId: string): CentreCode | null {
  for (const centre of FUTURE_SWIM_CENTRES) {
    if (serviceId.includes(`-${centre.code}-`) || serviceId.startsWith(`future-swim-${centre.code}-`)) {
      return centre.code;
    }
  }
  return null;
}

async function fetchFutureSwimCatalog(): Promise<ServiceRow[]> {
  const response = await fetch('/api/booking-assistant/catalog', {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Unable to load Future Swim catalogue (${response.status}).`);
  }
  const payload = (await response.json()) as BookingAssistantCatalogResponse;
  const services = Array.isArray(payload.services) ? payload.services : [];

  return services
    .filter((service) => {
      const id = service.id ?? '';
      const bookingUrl = service.booking_url ?? '';
      const sourceUrl = service.source_url ?? '';
      return (
        id.startsWith('future-swim-') ||
        bookingUrl.includes('futureswim.com.au') ||
        sourceUrl.includes('futureswim.com.au')
      );
    })
    .map((service) => {
      const id = service.id ?? '';
      return {
        candidateId: id,
        providerName: 'Future Swim',
        serviceName: service.name ?? 'Future Swim lesson',
        sourceType: 'service_catalog',
        category: service.category ?? 'Kids Services',
        summary: service.summary ?? 'Future Swim lesson and enrolment option.',
        venueName: service.venue_name ?? 'Future Swim',
        location: service.location ?? 'Sydney NSW',
        bookingUrl: service.booking_url ?? null,
        mapUrl: service.map_url ?? null,
        sourceUrl: service.source_url ?? null,
        imageUrl: service.image_url ?? null,
        amountAud: service.amount_aud ?? null,
        currencyCode: 'AUD',
        displayPrice: formatPrice(service.display_price, service.amount_aud),
        tags: Array.isArray(service.tags) ? service.tags.filter(Boolean) : [],
        featured: Boolean(service.featured),
        centreCode: parseCentreCode(id),
        levelCode: parseLevelCode(id),
      } satisfies ServiceRow;
    })
    .filter((service) => service.candidateId);
}

export function FutureSwimApp() {
  const [catalogServices, setCatalogServices] = useState<ServiceRow[]>([]);
  const [catalogPending, setCatalogPending] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [askOpen, setAskOpen] = useState(false);
  const [askInitialQuery, setAskInitialQuery] = useState<string | null>(null);
  const [timetableCentre, setTimetableCentre] = useState<CentreCode>('caringbah');
  const [timetableLevel, setTimetableLevel] = useState<LevelCode>('learn-to-swim');
  const [leadPending, setLeadPending] = useState(false);
  const [leadStatus, setLeadStatus] = useState('');
  const [leadError, setLeadError] = useState('');
  const [thankYouCountdown, setThankYouCountdown] = useState(5);
  const [formState, setFormState] = useState<InquiryFormState>(initialInquiryFormState);

  useEffect(() => {
    document.title = 'Future Swim · Small-class swim lessons in Sydney';
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setCatalogPending(true);
      setCatalogError('');
      try {
        const services = await fetchFutureSwimCatalog();
        if (cancelled) return;
        setCatalogServices(services);
      } catch (error) {
        if (!cancelled) {
          setCatalogError(
            error instanceof Error ? error.message : 'Unable to load Future Swim catalogue.',
          );
        }
      } finally {
        if (!cancelled) setCatalogPending(false);
      }
    }
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!leadStatus) {
      setThankYouCountdown(5);
      return;
    }
    setThankYouCountdown(5);
    const interval = window.setInterval(() => {
      setThankYouCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    const timer = window.setTimeout(() => {
      setLeadStatus('');
      setLeadError('');
      setLeadPending(false);
      setFormState(initialInquiryFormState);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 5000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [leadStatus]);

  const levelOfferings = useMemo(() => {
    const map = new Map<LevelOfferingKey, ServiceRow>();
    for (const service of catalogServices) {
      if (service.centreCode && service.levelCode) {
        map.set(`${service.centreCode}-${service.levelCode}`, service);
      }
    }
    return map;
  }, [catalogServices]);

  const centreServices = useMemo(() => {
    const map = new Map<CentreCode, ServiceRow>();
    for (const service of catalogServices) {
      if (service.centreCode && !service.levelCode) {
        map.set(service.centreCode, service);
      }
    }
    return map;
  }, [catalogServices]);

  function priceForCentre(centre: Centre): string {
    const direct = centreServices.get(centre.code);
    if (direct) return direct.displayPrice ?? formatPrice(null, direct.amountAud);
    const anyOffering = Array.from(levelOfferings.values()).find(
      (service) => service.centreCode === centre.code,
    );
    if (anyOffering) return anyOffering.displayPrice ?? formatPrice(null, anyOffering.amountAud);
    return 'Please enquire';
  }

  function priceForCentreLevel(centre: CentreCode, level: LevelCode): string | null {
    const offering = levelOfferings.get(`${centre}-${level}`);
    if (!offering) return null;
    return offering.displayPrice ?? formatPrice(null, offering.amountAud);
  }

  function selectedOffering(): ServiceRow | null {
    const offering = levelOfferings.get(`${formState.centreCode}-${formState.levelCode}`);
    if (offering) return offering;
    return centreServices.get(formState.centreCode) ?? null;
  }

  function openAskWith(prompt?: string) {
    if (prompt) setAskInitialQuery(prompt);
    setAskOpen(true);
  }

  function jumpToBookTrial(centre: CentreCode, level: LevelCode) {
    setFormState((current) => ({ ...current, centreCode: centre, levelCode: level }));
    const target = document.getElementById('book-trial');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleChooseLevel(levelCode: LevelCode) {
    setFormState((current) => ({ ...current, levelCode }));
    setTimetableLevel(levelCode);
    const target = document.getElementById('timetable');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleInquirySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLeadPending(true);
    setLeadError('');
    setLeadStatus('');

    try {
      const trimmedEmail = formState.email.trim();
      const trimmedPhone = formState.phone.trim();
      if (!trimmedEmail && !trimmedPhone) {
        throw new Error('Please provide at least an email or phone number so Future Swim can follow up.');
      }
      const offering = selectedOffering();
      if (!offering?.candidateId) {
        throw new Error('Please choose a Future Swim centre and level before submitting.');
      }

      const detailNote = [
        `Child age: ${formState.childAge}`,
        `Confidence: ${formState.confidenceLevel}`,
        offering.serviceName ? `Selected service: ${offering.serviceName}` : null,
        offering.venueName ? `Preferred centre: ${offering.venueName}` : null,
        formState.notes.trim() ? `Parent notes: ${formState.notes.trim()}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      let bookingReference = '';
      let leadId = 'captured';

      if (formState.preferredDate && formState.preferredTime) {
        const authoritativeResult = await createPublicBookingAssistantLeadAndBookingIntent({
          customerName: formState.parentName.trim() || 'Future Swim parent',
          customerEmail: trimmedEmail,
          customerPhone: trimmedPhone,
          serviceId: offering.candidateId,
          serviceName: offering.serviceName,
          serviceCategory: offering.category || 'Kids Services',
          requestedDate: formState.preferredDate,
          requestedTime: formState.preferredTime,
          timezone: 'Australia/Sydney',
          sourcePage: DEFAULT_SOURCE_PAGE,
          notes: detailNote,
          runtimeConfig: buildRuntimeConfig(),
        });
        bookingReference = authoritativeResult.bookingReference || '';
        leadId = authoritativeResult.leadId || leadId;
      } else {
        const leadResponse = await apiV1.createLead({
          lead_type: 'swim_school_enquiry',
          contact: {
            full_name: formState.parentName.trim() || 'Future Swim parent',
            email: trimmedEmail || null,
            phone: trimmedPhone || null,
            preferred_contact_method: trimmedEmail ? 'email' : 'phone',
          },
          business_context: {
            business_name: 'Future Swim',
            industry: 'Kids Services',
            location: offering.venueName || offering.location || null,
            service_category: offering.category || 'Kids swim lessons',
          },
          attribution: buildAttribution(),
          intent_context: {
            source_page: DEFAULT_SOURCE_PAGE,
            intent_type: 'booking_or_callback',
            notes: detailNote,
            requested_service_id: offering.candidateId,
          },
          actor_context: buildActorContext(),
        });
        if ('data' in leadResponse && leadResponse.data.lead_id) {
          leadId = leadResponse.data.lead_id;
        }
      }

      if (trimmedEmail) {
        await apiV1.sendLifecycleEmail({
          template_key: 'booking_confirmation',
          to: [trimmedEmail],
          subject: 'Future Swim enquiry received',
          variables: {
            parent_name: formState.parentName.trim() || 'Parent',
            child_age: formState.childAge,
            preferred_location: offering.venueName || 'Future Swim',
            preferred_date: formState.preferredDate || 'To be confirmed',
            preferred_time: formState.preferredTime || 'To be confirmed',
            booking_reference: bookingReference || 'pending-follow-up',
          },
          context: {
            tenant_ref: FUTURE_SWIM_TENANT_REF,
            source_surface: DEFAULT_SOURCE_PAGE,
          },
          actor_context: buildActorContext(),
        });
      }

      setLeadStatus(
        bookingReference
          ? `Your booking request has been received. Reference: ${bookingReference}. The Future Swim team will be in touch soon.`
          : `Your enquiry has been received. The Future Swim team will be in touch soon.`,
      );
      setFormState((current) => ({ ...current, notes: '' }));
      void leadId;
    } catch (error) {
      setLeadError(
        error instanceof Error ? error.message : 'Unable to submit your Future Swim enquiry right now.',
      );
    } finally {
      setLeadPending(false);
    }
  }

  const heroPriceLabel = useMemo(() => {
    const prices = catalogServices
      .map((service) => service.amountAud)
      .filter((value): value is number => typeof value === 'number' && value > 0.01);
    if (!prices.length) return 'From A$30 per 30-min lesson';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `A$${min} per 30-min lesson`;
    return `A$${min}–A$${max} per 30-min lesson`;
  }, [catalogServices]);

  return (
    <main id="top" className="fs-app fs-shell">
      <FutureSwimHeader
        onOpenAsk={() => openAskWith()}
        whatsappHref={WHATSAPP_HREF}
        telegramHref={TELEGRAM_HREF}
      />

      {/* HERO */}
      <section className="fs-hero fs-water-pattern" aria-labelledby="fs-hero-title">
        <div className="fs-container">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="fs-kicker">Future Swim · Sydney</div>
              <h1 id="fs-hero-title" className="fs-h1 mt-4">
                Small-class swim lessons that build real confidence — from first splash to pre-squad.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[color:var(--fs-text-muted)]">
                Five Sydney centres. Warm ozone-treated pools. Maximum 3 children per beginner class.
                Find your level, see weekly times, and reserve a spot in seconds with Future Swim Ask.
              </p>

              <div className="mt-6 flex flex-wrap gap-2" aria-label="Trust signals">
                {TRUST_SIGNALS.map((signal) => (
                  <span key={signal} className="fs-chip">
                    {signal}
                  </span>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#levels" className="fs-button" aria-label="Find your level">
                  Find your level
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => openAskWith()}
                  className="fs-button-coral"
                  aria-label="Open Future Swim Ask"
                >
                  <Waves size={16} aria-hidden="true" />
                  Open Future Swim Ask
                </button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="fs-card-flat">
                  <div className="fs-kicker">Centres</div>
                  <div className="mt-2 text-3xl font-bold tracking-tight">5</div>
                  <div className="text-sm text-[color:var(--fs-text-muted)]">Sydney-wide</div>
                </div>
                <div className="fs-card-flat">
                  <div className="fs-kicker">Levels</div>
                  <div className="mt-2 text-3xl font-bold tracking-tight">4</div>
                  <div className="text-sm text-[color:var(--fs-text-muted)]">Babies to pre-squad</div>
                </div>
                <div className="fs-card-flat">
                  <div className="fs-kicker">Per-lesson</div>
                  <div className="mt-2 text-2xl font-bold tracking-tight">{heroPriceLabel.split(' ')[0]}</div>
                  <div className="text-sm text-[color:var(--fs-text-muted)]">30-min lessons</div>
                </div>
              </div>
            </div>

            <div className="fs-card-feature">
              <div className="fs-kicker">Future Swim Ask</div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[color:var(--fs-text)]">
                Tell us about your swimmer.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[color:var(--fs-text-muted)]">
                Our chat assistant shortlists Future Swim levels, centres, and times based on your
                child&apos;s age and confidence — then hands you straight to booking.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  'Match age + ability to the right level',
                  'See weekly slots at your nearest centre',
                  'Book or hold a spot in under a minute',
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-[color:var(--fs-primary-dark)]" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => openAskWith()}
                className="fs-button mt-5 w-full"
                aria-label="Open Future Swim Ask now"
              >
                Open Future Swim Ask
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <svg
          className="fs-hero-waves"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,32 C240,80 480,0 720,32 C960,64 1200,16 1440,40 L1440,80 L0,80 Z"
            fill="rgba(14,165,233,0.18)"
          />
          <path
            d="M0,48 C240,16 480,72 720,48 C960,24 1200,72 1440,48 L1440,80 L0,80 Z"
            fill="rgba(14,165,233,0.10)"
          />
        </svg>
      </section>

      {/* LEVELS */}
      <section id="levels" className="fs-container py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="fs-kicker">Levels</div>
          <h2 className="fs-section-title mt-3">Choose your level</h2>
          <p className="fs-section-lead mt-3">
            Four official Future Swim levels run at every active centre — from babies in arms to
            squad-ready swimmers. Group sizes stay small so every child gets real coaching time in
            the water.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {FUTURE_SWIM_LEVELS.map((level) => (
            <LevelCard key={level.code} level={level} onChoose={handleChooseLevel} />
          ))}
        </div>
      </section>

      {/* CENTRES */}
      <section id="centres" className="fs-container py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="fs-kicker">Centres</div>
          <h2 className="fs-section-title mt-3">Find your nearest centre</h2>
          <p className="fs-section-lead mt-3">
            Five purpose-built indoor pools across Sydney — Sutherland Shire, the inner west, and
            the north-west growth corridor. Every centre runs warm ozone-treated water year-round.
          </p>
        </div>

        {catalogPending ? (
          <div className="fs-card-flat mt-8 text-sm text-[color:var(--fs-text-muted)]">
            Loading the live Future Swim catalogue&hellip;
          </div>
        ) : null}
        {catalogError ? (
          <div className="fs-card-flat mt-8 border-[color:var(--fs-danger)] text-sm text-[color:var(--fs-danger)]">
            {catalogError}
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {FUTURE_SWIM_CENTRES.map((centre) => (
            <CentreCard
              key={centre.code}
              centre={centre}
              priceLabel={priceForCentre(centre)}
              whatsappHref={WHATSAPP_HREF}
              telegramHref={TELEGRAM_HREF}
            />
          ))}
        </div>
      </section>

      {/* TIMETABLE */}
      <section id="timetable" className="fs-container py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="fs-kicker">Timetable</div>
          <h2 className="fs-section-title mt-3">Weekly timetable</h2>
          <p className="fs-section-lead mt-3">
            Pick a centre and level to see this term&apos;s 30-minute lesson slots. Times can change
            at short notice — confirm before your first lesson.
          </p>
        </div>

        <div className="mt-8 fs-card">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--fs-text-soft)]">
              1. Choose centre
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Choose centre">
              {FUTURE_SWIM_CENTRES.map((centre) => (
                <button
                  key={centre.code}
                  type="button"
                  role="tab"
                  aria-selected={timetableCentre === centre.code}
                  className={`fs-button-ghost ${timetableCentre === centre.code ? 'fs-active' : ''}`}
                  onClick={() => setTimetableCentre(centre.code)}
                >
                  <MapPin size={14} aria-hidden="true" />
                  {centre.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--fs-text-soft)]">
              2. Choose level
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Choose level">
              {FUTURE_SWIM_LEVELS.map((level) => (
                <button
                  key={level.code}
                  type="button"
                  role="tab"
                  aria-selected={timetableLevel === level.code}
                  className={`fs-button-ghost ${timetableLevel === level.code ? 'fs-active' : ''}`}
                  onClick={() => setTimetableLevel(level.code)}
                >
                  {level.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-[color:var(--fs-border)] pt-6">
            <TimetableGrid
              centre={timetableCentre}
              level={timetableLevel}
              priceLabel={priceForCentreLevel(timetableCentre, timetableLevel)}
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="fs-button"
                onClick={() => jumpToBookTrial(timetableCentre, timetableLevel)}
                aria-label="Reserve a spot for this centre and level"
              >
                Reserve this slot
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="fs-button-secondary"
                onClick={() => openAskWith(`Show me ${timetableLevel} times at Future Swim ${timetableCentre}.`)}
              >
                <Waves size={16} aria-hidden="true" />
                Ask about this slot
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="fs-container py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <div className="fs-kicker">Pricing</div>
            <h2 className="fs-section-title mt-3">Stable per-lesson rate. No surprises.</h2>
            <p className="fs-section-lead mt-4">
              Future Swim charges a stable per-lesson rate, billed monthly by direct debit so your
              child&apos;s spot is held all term — just like enrolling at the centre directly.
              You&apos;re charged ongoing for your reserved spot, not per-attendance. Cancel before
              the 25th of any month to avoid the next billing cycle.
            </p>
            <ul className="mt-5 space-y-2 text-sm leading-7 text-[color:var(--fs-text)]">
              <li className="flex gap-2">
                <Droplet size={14} aria-hidden="true" className="mt-1.5 text-[color:var(--fs-primary-dark)]" />
                30-minute lessons in warm ozone-treated water.
              </li>
              <li className="flex gap-2">
                <Users size={14} aria-hidden="true" className="mt-1.5 text-[color:var(--fs-primary-dark)]" />
                Maximum 3 in beginner classes; 4 in stroke and pre-squad.
              </li>
              <li className="flex gap-2">
                <Clock size={14} aria-hidden="true" className="mt-1.5 text-[color:var(--fs-primary-dark)]" />
                Make-up lessons available with notice.
              </li>
            </ul>
            <p className="mt-5 text-xs text-[color:var(--fs-text-soft)]">
              Source:{' '}
              <a
                href="https://futureswim.com.au/pricing/"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                futureswim.com.au/pricing
              </a>
              . Where a centre&apos;s rate is not published, we use a regional reference rate —
              confirm the exact fee with the centre before enrolling.
            </p>
          </div>

          <div className="fs-card p-0 overflow-hidden">
            <table className="fs-pricing-table">
              <thead>
                <tr>
                  <th>Centre</th>
                  <th>Per-lesson rate</th>
                </tr>
              </thead>
              <tbody>
                {FUTURE_SWIM_CENTRES.map((centre) => (
                  <tr key={centre.code}>
                    <td>
                      <div className="font-semibold text-[color:var(--fs-text)]">{centre.name}</div>
                      <div className="text-xs text-[color:var(--fs-text-muted)]">{centre.address}</div>
                    </td>
                    <td>
                      <div className="font-semibold">{priceForCentre(centre)}</div>
                      {centre.pricingIndicative ? (
                        <div className="text-xs text-[color:var(--fs-text-soft)]">Indicative</div>
                      ) : (
                        <div className="text-xs text-[color:var(--fs-success)]">Confirmed</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="fs-container py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="fs-kicker">FAQ</div>
          <h2 className="fs-section-title mt-3">Parent questions, answered</h2>
        </div>
        <div className="fs-faq mt-8 max-w-3xl">
          {FAQS.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <div className="fs-faq-body">{faq.answer}</div>
            </details>
          ))}
        </div>
      </section>

      {/* BOOK / LEAD FORM */}
      <section id="book-trial" className="fs-container py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="fs-kicker">Reserve</div>
            <h2 className="fs-section-title mt-3">Book a trial or reserve a spot</h2>
            <p className="fs-section-lead mt-4">
              Tell us about your swimmer. With a preferred date and time we&apos;ll create a hold;
              without one, we&apos;ll follow up to find a slot that works for the whole family.
            </p>
            <ul className="mt-5 space-y-2 text-sm leading-7 text-[color:var(--fs-text-muted)]">
              <li>St Peters offers a free trial lesson for new families.</li>
              <li>Confirmation email comes through after submission.</li>
              <li>Make-up lessons are arranged directly with your centre.</li>
            </ul>
          </div>

          <form onSubmit={handleInquirySubmit} className="fs-card">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={formState.parentName}
                onChange={(event) => setFormState((current) => ({ ...current, parentName: event.target.value }))}
                className="fs-input"
                placeholder="Parent name"
                aria-label="Parent name"
                autoComplete="name"
              />
              <input
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                className="fs-input"
                placeholder="Email"
                aria-label="Email"
                inputMode="email"
                autoComplete="email"
              />
              <input
                type="tel"
                value={formState.phone}
                onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                className="fs-input"
                placeholder="Phone"
                aria-label="Phone"
                inputMode="tel"
                autoComplete="tel"
              />
              <select
                value={formState.childAge}
                onChange={(event) => setFormState((current) => ({ ...current, childAge: event.target.value }))}
                className="fs-select"
                aria-label="Child age"
              >
                {['Under 1', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11+'].map((age) => (
                  <option key={age} value={age}>{`Child age: ${age}`}</option>
                ))}
              </select>
              <select
                value={formState.confidenceLevel}
                onChange={(event) => setFormState((current) => ({ ...current, confidenceLevel: event.target.value }))}
                className="fs-select md:col-span-2"
                aria-label="Confidence level"
              >
                {['Nervous beginner', 'Comfortable beginner', 'Improving confidence', 'Ready for progression'].map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <select
                value={formState.centreCode}
                onChange={(event) => setFormState((current) => ({ ...current, centreCode: event.target.value as CentreCode }))}
                className="fs-select"
                aria-label="Preferred centre"
              >
                {FUTURE_SWIM_CENTRES.map((centre) => (
                  <option key={centre.code} value={centre.code}>{`Centre: ${centre.name}`}</option>
                ))}
              </select>
              <select
                value={formState.levelCode}
                onChange={(event) => setFormState((current) => ({ ...current, levelCode: event.target.value as LevelCode }))}
                className="fs-select"
                aria-label="Preferred level"
              >
                {FUTURE_SWIM_LEVELS.map((level) => (
                  <option key={level.code} value={level.code}>{`Level: ${level.name}`}</option>
                ))}
              </select>
              <input
                type="date"
                value={formState.preferredDate}
                onChange={(event) => setFormState((current) => ({ ...current, preferredDate: event.target.value }))}
                className="fs-input"
                aria-label="Preferred date"
              />
              <input
                type="time"
                value={formState.preferredTime}
                onChange={(event) => setFormState((current) => ({ ...current, preferredTime: event.target.value }))}
                className="fs-input"
                aria-label="Preferred time"
              />
            </div>

            <textarea
              value={formState.notes}
              onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
              className="fs-textarea mt-4"
              placeholder="Anything Future Swim should know — water confidence, prior lessons, sibling needs, preferred days, or whether you want an assessment first."
              aria-label="Notes for Future Swim"
            />

            <div className="mt-4 fs-card-flat text-sm leading-6 text-[color:var(--fs-text-muted)]">
              Add a preferred date and time to lock in the booking. Without them, your enquiry is
              still recorded and the team will follow up to find a time.
            </div>

            <button
              type="submit"
              disabled={leadPending}
              className="fs-button mt-5"
              aria-label="Save my spot in this Future Swim class"
            >
              {leadPending ? 'Submitting…' : 'Save my spot'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>

            {leadStatus ? (
              <div className="mt-4 fs-card-flat">
                <div className="fs-kicker">Thank you</div>
                <div className="mt-2 text-xl font-bold tracking-tight text-[color:var(--fs-text)]">
                  Your booking request has been received.
                </div>
                <p className="mt-2 text-sm leading-7 text-[color:var(--fs-text-muted)]">{leadStatus}</p>
                <div className="mt-3 text-xs text-[color:var(--fs-text-soft)]">
                  Returning to the top in {thankYouCountdown}s
                </div>
              </div>
            ) : null}
            {leadError ? (
              <div className="mt-4 fs-card-flat" style={{ borderColor: 'var(--fs-danger)', color: 'var(--fs-danger)' }}>
                {leadError}
              </div>
            ) : null}
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="fs-footer">
        <div className="fs-container">
          <div className="fs-footer-grid">
            <div>
              <div className="flex items-center gap-3">
                <span className="fs-brand-mark" aria-hidden="true">
                  <Waves size={20} />
                </span>
                <div>
                  <div className="text-base font-bold text-white">Future Swim</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--fs-primary-soft)]">
                    Sydney swim school
                  </div>
                </div>
              </div>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/80">
                Leading swim school for babies and children in Sydney. Five centres, four levels,
                small classes, warm pools.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noreferrer"
                  className="fs-sticky-button fs-sticky-whatsapp"
                  style={{ minHeight: 38, padding: '6px 14px', fontSize: '0.78rem' }}
                  aria-label="Chat with Future Swim on WhatsApp"
                >
                  WhatsApp
                </a>
                <a
                  href={TELEGRAM_HREF}
                  target="_blank"
                  rel="noreferrer"
                  className="fs-sticky-button fs-sticky-telegram"
                  style={{ minHeight: 38, padding: '6px 14px', fontSize: '0.78rem' }}
                  aria-label="Chat with Future Swim on Telegram"
                >
                  Telegram
                </a>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--fs-primary-soft)]">
                Centres
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {FUTURE_SWIM_CENTRES.map((centre) => (
                  <li key={centre.code}>
                    <a href={centre.sourceUrl} target="_blank" rel="noreferrer">
                      {centre.name} — {centre.phoneDisplay}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--fs-primary-soft)]">
                Explore
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="#levels">Levels</a></li>
                <li><a href="#centres">Centres</a></li>
                <li><a href="#timetable">Timetable</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="https://futureswim.com.au" target="_blank" rel="noreferrer">futureswim.com.au</a></li>
              </ul>
            </div>
          </div>

          <div className="fs-footer-meta">
            <span>&copy; {new Date().getFullYear()} Future Swim · Sydney NSW</span>
            <span>
              Powered by{' '}
              <a href="https://bookedai.au/" target="_blank" rel="noreferrer">
                BookedAI
              </a>
            </span>
          </div>
        </div>
      </footer>

      <StickyChatCtas
        onOpenAsk={() => openAskWith()}
        whatsappHref={WHATSAPP_HREF}
        telegramHref={TELEGRAM_HREF}
      />
      <FutureSwimAsk
        open={askOpen}
        onOpenChange={(value) => {
          setAskOpen(value);
          if (!value) setAskInitialQuery(null);
        }}
        initialQuery={askInitialQuery}
      />
    </main>
  );
}
