import { FormEvent, useEffect, useMemo, useState } from 'react';

import { createPublicBookingAssistantLeadAndBookingIntent } from '../../components/landing/assistant/publicBookingAssistantV1';
import { apiV1 } from '../../shared/api/v1';
import type { MatchCandidate } from '../../shared/contracts';

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type InquiryFormState = {
  parentName: string;
  email: string;
  phone: string;
  childAge: string;
  confidenceLevel: string;
  preferredDate: string;
  preferredTime: string;
  selectedServiceId: string;
  notes: string;
};

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

const FUTURE_SWIM_TENANT_REF = 'future-swim';
const DEFAULT_SOURCE_PAGE = 'future-swim-runtime';

const quickPrompts = [
  'My child is 3 and nervous in the water. Which Future Swim centre is the best fit in the Shire?',
  'Find a small-class beginner lesson near Miranda for a 4-year-old on weekends.',
  'We want a warm-pool class for a 5-year-old near Leichhardt.',
  'Which Future Swim location is best for early water confidence and make-up lessons?',
];

const reassurancePoints = [
  'Results and recommendations are limited to Future Swim centres only.',
  'Prices and centre links reflect the current Future Swim catalogue.',
  'Booking requests, enquiries, and confirmation emails are handled securely through the BookedAI platform.',
  'Designed for parents — not a generic chatbot.',
];

const initialInquiryFormState: InquiryFormState = {
  parentName: '',
  email: '',
  phone: '',
  childAge: '4',
  confidenceLevel: 'Nervous beginner',
  preferredDate: '',
  preferredTime: '',
  selectedServiceId: '',
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
  if (price && price.trim()) {
    return price.trim();
  }
  if (typeof amount === 'number' && amount > 0.01) {
    return `A$${amount.toFixed(Number.isInteger(amount) ? 0 : 2)}`;
  }
  return 'Please enquire';
}

function formatAmountBand(services: MatchCandidate[]) {
  const priced = services
    .map((service) => service.amountAud)
    .filter((value): value is number => typeof value === 'number' && value > 0.01)
    .sort((a, b) => a - b);

  if (!priced.length) {
    return 'Enquire for pricing';
  }

  const min = priced[0];
  const max = priced[priced.length - 1];
  if (min === max) {
    return `From A$${min.toFixed(Number.isInteger(min) ? 0 : 2)}`;
  }
  return `A$${min.toFixed(Number.isInteger(min) ? 0 : 2)} to A$${max.toFixed(Number.isInteger(max) ? 0 : 2)}`;
}

function buildAssistantReply(results: MatchCandidate[]) {
  if (!results.length) {
    return 'I could not find a perfect match from that description. You can still send an enquiry below and the Future Swim team will follow up with you.';
  }

  const top = results[0];
  const second = results[1];
  if (second) {
    return `The best current Future Swim matches are ${top.venueName || top.serviceName} and ${second.venueName || second.serviceName}. Choose one below and I’ll move it into the booking flow.`;
  }

  return `The closest Future Swim match is ${top.venueName || top.serviceName}. Continue below to enquire or send a booking request.`;
}

async function fetchFutureSwimCatalog(): Promise<MatchCandidate[]> {
  const response = await fetch('/api/booking-assistant/catalog', {
    headers: {
      accept: 'application/json',
    },
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
    .map((service) => ({
      candidateId: service.id ?? '',
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
    }))
    .filter((service) => service.candidateId)
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.serviceName.localeCompare(b.serviceName));
}

export function FutureSwimApp() {
  const [catalogServices, setCatalogServices] = useState<MatchCandidate[]>([]);
  const [catalogPending, setCatalogPending] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [searchQuery, setSearchQuery] = useState(quickPrompts[0]);
  const [searchResults, setSearchResults] = useState<MatchCandidate[]>([]);
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      role: 'assistant',
      content:
        'Welcome to Future Swim. Tell me your child’s age, confidence level, and preferred area, and I will shortlist only Future Swim options.',
    },
  ]);
  const [searchPending, setSearchPending] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [leadPending, setLeadPending] = useState(false);
  const [leadStatus, setLeadStatus] = useState('');
  const [leadError, setLeadError] = useState('');
  const [thankYouReturnCountdown, setThankYouReturnCountdown] = useState(5);
  const [formState, setFormState] = useState<InquiryFormState>(initialInquiryFormState);

  function returnToMainScreenAfterBooking() {
    setLeadStatus('');
    setLeadError('');
    setLeadPending(false);
    setFormState(initialInquiryFormState);
    window.history.replaceState({}, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    document.title = 'Future Swim | Live BookedAI tenant — bookings, payments, follow-up';
  }, []);

  useEffect(() => {
    if (!leadStatus) {
      setThankYouReturnCountdown(5);
      return;
    }

    setThankYouReturnCountdown(5);
    const countdownInterval = window.setInterval(() => {
      setThankYouReturnCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    const returnTimer = window.setTimeout(() => {
      returnToMainScreenAfterBooking();
    }, 5000);

    return () => {
      window.clearInterval(countdownInterval);
      window.clearTimeout(returnTimer);
    };
  }, [leadStatus]);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setCatalogPending(true);
      setCatalogError('');
      try {
        const services = await fetchFutureSwimCatalog();
        if (cancelled) {
          return;
        }
        setCatalogServices(services);
        setFormState((current) => ({
          ...current,
          selectedServiceId: current.selectedServiceId || services[0]?.candidateId || '',
        }));
      } catch (error) {
        if (!cancelled) {
          setCatalogError(error instanceof Error ? error.message : 'Unable to load Future Swim catalogue.');
        }
      } finally {
        if (!cancelled) {
          setCatalogPending(false);
        }
      }
    }

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayedResults = searchResults.length ? searchResults : catalogServices;

  const selectedResult = useMemo(
    () => displayedResults.find((item) => item.candidateId === formState.selectedServiceId) ?? catalogServices[0] ?? null,
    [catalogServices, displayedResults, formState.selectedServiceId],
  );

  const heroMetrics = useMemo(() => {
    const uniqueVenues = new Set(catalogServices.map((item) => item.venueName || item.serviceName));
    return {
      centreCount: uniqueVenues.size,
      priceBand: formatAmountBand(catalogServices),
      featuredCount: catalogServices.filter((item) => item.featured).length,
    };
  }, [catalogServices]);

  async function handleSearchSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      return;
    }

    setSearchPending(true);
    setSearchError('');
    setConversation((current) => [...current, { role: 'user', content: trimmedQuery }]);

    try {
      const response = await apiV1.searchCandidates({
        query: trimmedQuery,
        location: null,
        preferences: {
          service_category: 'Kids Services',
        },
        channel_context: {
          channel: 'public_web',
          deployment_mode: 'standalone_app',
          tenant_ref: FUTURE_SWIM_TENANT_REF,
          widget_id: 'future-swim-concierge',
        },
        attribution: buildAttribution(),
      });

      if (!('data' in response)) {
        throw new Error('Search was accepted, but no shortlist was returned yet.');
      }

      const nextResults = response.data.candidates
        .filter((candidate) => candidate.providerName === 'Future Swim' || candidate.candidateId.startsWith('future-swim-'))
        .slice(0, 6);

      setSearchResults(nextResults);
      setFormState((current) => ({
        ...current,
        selectedServiceId: nextResults[0]?.candidateId || current.selectedServiceId,
      }));
      setConversation((current) => [...current, { role: 'assistant', content: buildAssistantReply(nextResults) }]);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Unable to search Future Swim right now.');
      setConversation((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'The search is temporarily unavailable. You can still submit your enquiry below and the Future Swim team will be in touch.',
        },
      ]);
    } finally {
      setSearchPending(false);
    }
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
      if (!selectedResult?.candidateId) {
        throw new Error('Please choose a Future Swim centre or lesson option before submitting.');
      }

      const detailNote = [
        `Child age: ${formState.childAge}`,
        `Confidence: ${formState.confidenceLevel}`,
        selectedResult.serviceName ? `Selected service: ${selectedResult.serviceName}` : null,
        selectedResult.venueName ? `Preferred centre: ${selectedResult.venueName}` : null,
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
          serviceId: selectedResult.candidateId,
          serviceName: selectedResult.serviceName,
          serviceCategory: selectedResult.category || 'Kids Services',
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
            location: selectedResult.venueName || selectedResult.location || null,
            service_category: selectedResult.category || 'Kids swim lessons',
          },
          attribution: buildAttribution(),
          intent_context: {
            source_page: DEFAULT_SOURCE_PAGE,
            intent_type: 'booking_or_callback',
            notes: detailNote,
            requested_service_id: selectedResult.candidateId,
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
            preferred_location: selectedResult.venueName || 'Future Swim',
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
      setFormState((current) => ({
        ...current,
        notes: '',
      }));
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : 'Unable to submit your Future Swim enquiry right now.');
    } finally {
      setLeadPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-apple-light text-apple-near-black">
      <div className="mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-8 lg:px-10 lg:pb-24">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="template-kicker">Future Swim · Verified BookedAI tenant</div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-apple-near-black">
              Live swim school running on BookedAI
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="#centres"
              className="booked-button-secondary"
              aria-label="View available swim centres"
            >
              View live tenant
            </a>
            <a
              href="#booking-flow"
              className="booked-button"
              aria-label="Save my spot in a Future Swim class"
            >
              Save my spot
            </a>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <div className="template-card-dark p-8 sm:p-10">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/88">
              Verified BookedAI tenant · Stripe · WhatsApp · Calendar
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-white sm:text-5xl md:text-6xl md:leading-[0.98]">
              Watch BookedAI run a live swim school — bookings, payments, and follow-up.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
              Real bookings, real Stripe payments, real audit ledger. Search the live Future Swim catalogue, choose a centre, and your booking moves into the same operator console every BookedAI business runs on.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#booking-flow"
                className="booked-button"
                aria-label="Run the live Future Swim demo"
              >
                Run the live demo
              </a>
              <a
                href="https://bookedai.au/"
                className="booked-button-secondary apple-button-secondary-dark"
                aria-label="Talk to a BookedAI human about this tenant"
              >
                Talk to a BookedAI human
              </a>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[var(--apple-radius-large)] border border-white/12 bg-white/10 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/74">Centres in flow</div>
                <div className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{heroMetrics.centreCount || '6'}</div>
                <div className="mt-2 text-sm text-white/74">Live Future Swim venues from the operator catalogue.</div>
              </div>
              <div className="rounded-[var(--apple-radius-large)] border border-white/12 bg-white/10 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/74">Current pricing</div>
                <div className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{heroMetrics.priceBand}</div>
                <div className="mt-2 text-sm text-white/74">Loaded from the live BookedAI operator catalogue.</div>
              </div>
              <div className="rounded-[var(--apple-radius-large)] border border-white/12 bg-white/10 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/74">Featured centres</div>
                <div className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{heroMetrics.featuredCount || '4'}</div>
                <div className="mt-2 text-sm text-white/74">Priority venues ready for parent-facing promotion.</div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setSearchQuery(prompt)}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-left text-xs font-semibold text-white/88 transition hover:bg-white/16"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <aside className="template-card p-7 sm:p-8">
            <div className="template-kicker">What makes this different</div>
            <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.04em] text-apple-near-black">
              Real bookings. Real Stripe payments. Real audit ledger.
            </h2>
            <div className="mt-6 space-y-3">
              {reassurancePoints.map((item) => (
                <div key={item} className="template-card-subtle px-5 py-4 text-sm leading-7 text-[color:var(--apple-text-secondary)]">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 template-card-subtle p-5">
              <div className="template-kicker">Pricing note</div>
              <p className="mt-3 text-sm leading-7 text-[color:var(--apple-text-secondary)]">
                Prices reflect the live Future Swim operator catalogue. Confirm exact class fees and open spots with your preferred centre.
              </p>
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="template-card p-7">
            <div className="template-kicker">Find your centre</div>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-apple-near-black">Search the way a parent speaks</h2>
            <p className="mt-4 text-sm leading-7 text-[color:var(--apple-text-secondary)]">
              Tell us your child&apos;s age, confidence level, and preferred area. We&apos;ll shortlist the best-fit Future Swim centres for you.
            </p>

            <form className="mt-6" onSubmit={handleSearchSubmit}>
              <textarea
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="min-h-40 w-full rounded-[var(--apple-radius-large)] border border-[var(--template-border)] bg-white px-5 py-4 text-base leading-7 text-apple-near-black outline-none placeholder:text-[color:var(--apple-text-tertiary)] sm:text-sm"
                placeholder="My child is 4, nervous in the water, and we would prefer a weekend beginner class near Caringbah or Miranda."
                aria-label="Describe your child to find the best Future Swim centre"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={searchPending}
                  className="booked-button"
                  aria-label="Find best-fit Future Swim centres"
                >
                  {searchPending ? 'Searching Future Swim…' : 'Find best-fit centres'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchResults([]);
                    setSearchError('');
                    setConversation((current) => current.slice(0, 1));
                  }}
                  className="booked-button-secondary"
                  aria-label="Reset shortlist"
                >
                  Reset shortlist
                </button>
              </div>
            </form>

            <div className="mt-6 space-y-3">
              {conversation.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-[var(--apple-radius-comfortable)] px-4 py-3 text-sm leading-7 ${
                    message.role === 'assistant'
                      ? 'template-card-subtle text-[color:var(--apple-text-secondary)]'
                      : 'bg-apple-near-black text-white'
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {searchError ? (
                <div className="rounded-[var(--apple-radius-comfortable)] template-card-subtle px-4 py-3 text-sm text-apple-near-black">
                  {searchError}
                </div>
              ) : null}
            </div>
          </div>

          <div id="centres" className="template-card p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="template-kicker">Live operator catalogue</div>
                <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-apple-near-black">Future Swim centres and products</h2>
              </div>
              <span className="template-chip">Live catalogue</span>
            </div>

            <div className="mt-6 space-y-4">
              {catalogPending ? <div className="template-card-subtle px-5 py-4 text-sm text-[color:var(--apple-text-secondary)]">Loading Future Swim catalogue…</div> : null}
              {catalogError ? <div className="template-card-subtle px-5 py-4 text-sm text-apple-near-black">{catalogError}</div> : null}
              {!catalogPending && !catalogError && !displayedResults.length ? (
                <div className="template-card-subtle px-5 py-4 text-sm text-[color:var(--apple-text-secondary)]">No Future Swim centres are currently visible in the catalogue.</div>
              ) : null}
              {displayedResults.map((result) => {
                const selected = formState.selectedServiceId === result.candidateId;
                return (
                  <article
                    key={result.candidateId}
                    className={`rounded-[var(--apple-radius-large)] border p-5 transition ${
                      selected ? 'border-[var(--apple-blue)] bg-white' : 'template-card-subtle'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="template-kicker">{result.venueName || 'Future Swim'}</div>
                        <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-apple-near-black">{result.serviceName}</h3>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--apple-text-secondary)]">{result.summary}</p>
                        <div className="mt-3 text-sm font-medium text-[color:var(--apple-text-secondary)]">{result.location}</div>
                      </div>
                      <div className="rounded-[var(--apple-radius-comfortable)] bg-white px-4 py-3 text-sm font-semibold text-apple-near-black shadow-sm">
                        {formatPrice(result.displayPrice, result.amountAud)}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setFormState((current) => ({ ...current, selectedServiceId: result.candidateId }))}
                        className="booked-button"
                        aria-label={selected ? 'Centre selected for booking' : `Choose ${result.venueName || 'this centre'}`}
                      >
                        {selected ? 'Selected for booking' : 'Choose this centre'}
                      </button>
                      {result.sourceUrl || result.bookingUrl ? (
                        <a
                          href={result.sourceUrl || result.bookingUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="booked-button-secondary"
                          aria-label={`Open ${result.venueName || 'Future Swim'} page in a new tab`}
                        >
                          View Future Swim page
                        </a>
                      ) : null}
                      {result.mapUrl ? (
                        <a
                          href={result.mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="booked-button-secondary"
                          aria-label={`Open map for ${result.venueName || 'this centre'}`}
                        >
                          Open map
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="booking-flow" className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="template-card-subtle p-7">
            <div className="template-kicker">How it works</div>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-apple-near-black">From parent request to booked follow-up</h2>
            <ol className="mt-6 space-y-4 text-sm leading-7 text-[color:var(--apple-text-secondary)]">
              <li className="rounded-[var(--apple-radius-comfortable)] bg-white px-5 py-4">1. Search stays focused on Future Swim only — no other businesses are recommended.</li>
              <li className="rounded-[var(--apple-radius-comfortable)] bg-white px-5 py-4">2. The parent selects a centre or lesson card with current pricing and source links.</li>
              <li className="rounded-[var(--apple-radius-comfortable)] bg-white px-5 py-4">3. Fill in your contact details, child age, and any notes for the team.</li>
              <li className="rounded-[var(--apple-radius-comfortable)] bg-white px-5 py-4">4. With a preferred date and time, a booking request is created and confirmed by email.</li>
              <li className="rounded-[var(--apple-radius-comfortable)] bg-white px-5 py-4">5. A confirmation email is sent to you, and the Future Swim team follows up to confirm your spot.</li>
            </ol>
          </div>

          <form onSubmit={handleInquirySubmit} className="template-card p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="template-kicker">Your details</div>
                <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-apple-near-black">Save my spot</h2>
              </div>
              <span className="template-chip">{selectedResult?.venueName || 'Select a centre'}</span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                value={formState.parentName}
                onChange={(event) => setFormState((current) => ({ ...current, parentName: event.target.value }))}
                className="min-h-[44px] rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-4 py-3 text-base outline-none sm:text-sm"
                placeholder="Parent name"
                aria-label="Parent name"
                autoComplete="name"
              />
              <input
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                className="min-h-[44px] rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-4 py-3 text-base outline-none sm:text-sm"
                placeholder="Email"
                aria-label="Email"
                inputMode="email"
                autoComplete="email"
              />
              <input
                type="tel"
                value={formState.phone}
                onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                className="min-h-[44px] rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-4 py-3 text-base outline-none sm:text-sm"
                placeholder="Phone"
                aria-label="Phone"
                inputMode="tel"
                autoComplete="tel"
              />
              <select
                value={formState.childAge}
                onChange={(event) => setFormState((current) => ({ ...current, childAge: event.target.value }))}
                className="rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-4 py-3 text-sm outline-none"
                aria-label="Child age"
              >
                {['2', '3', '4', '5', '6'].map((age) => (
                  <option key={age} value={age}>{`Child age: ${age}`}</option>
                ))}
              </select>
              <select
                value={formState.confidenceLevel}
                onChange={(event) => setFormState((current) => ({ ...current, confidenceLevel: event.target.value }))}
                className="rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-4 py-3 text-sm outline-none md:col-span-2"
                aria-label="Confidence level"
              >
                {['Nervous beginner', 'Comfortable beginner', 'Improving confidence', 'Ready for progression'].map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <input
                type="date"
                value={formState.preferredDate}
                onChange={(event) => setFormState((current) => ({ ...current, preferredDate: event.target.value }))}
                className="rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-4 py-3 text-sm outline-none"
                aria-label="Preferred date"
              />
              <input
                type="time"
                value={formState.preferredTime}
                onChange={(event) => setFormState((current) => ({ ...current, preferredTime: event.target.value }))}
                className="rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-4 py-3 text-sm outline-none"
                aria-label="Preferred time"
              />
            </div>

            <textarea
              value={formState.notes}
              onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
              className="mt-4 min-h-32 w-full rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-4 py-3 text-sm leading-7 outline-none"
              placeholder="Anything Future Swim should know — water confidence, prior lessons, sibling needs, preferred days, or whether you want an assessment first."
              aria-label="Notes for Future Swim"
            />

            <div className="mt-4 template-card-subtle px-4 py-4 text-sm leading-7 text-[color:var(--apple-text-secondary)]">
              Add a preferred date and time to lock in the booking. Without them, your enquiry is still recorded and the team will follow up to find a time.
            </div>

            <button
              type="submit"
              disabled={leadPending}
              className="booked-button mt-5 min-h-[44px]"
              aria-label="Save my spot in this Future Swim class"
            >
              {leadPending ? 'Submitting…' : 'Save my spot'}
            </button>

            {leadStatus ? (
              <div className="mt-4 template-card-subtle px-5 py-5">
                <div className="template-kicker">Thank you</div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-apple-near-black">
                  Your booking request has been received.
                </div>
                <p className="mt-2 text-sm leading-7 text-[color:var(--apple-text-secondary)]">{leadStatus}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="template-chip">Returning to the main screen in {thankYouReturnCountdown}s</span>
                  <button
                    type="button"
                    onClick={returnToMainScreenAfterBooking}
                    className="booked-button-secondary"
                    aria-label="Return to the main screen now"
                  >
                    Return now
                  </button>
                </div>
              </div>
            ) : null}
            {leadError ? <div className="mt-4 template-card-subtle px-4 py-3 text-sm text-apple-near-black">{leadError}</div> : null}
          </form>
        </section>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--apple-text-tertiary)]">
          <span>Verified BookedAI tenant · powered by BookedAI</span>
          <a
            href="https://bookedai.au/"
            className="text-[var(--apple-blue)] hover:underline"
            aria-label="Visit BookedAI homepage"
          >
            bookedai.au
          </a>
        </footer>
      </div>
    </main>
  );
}
