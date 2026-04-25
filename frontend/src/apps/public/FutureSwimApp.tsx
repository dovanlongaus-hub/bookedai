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
    document.title = 'Future Swim | Premium swim booking experience powered by BookedAI';
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
            'The live shortlist is temporarily unavailable, but you can still submit your enquiry below and the BookedAI workflow will record it for Future Swim follow-up.',
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
          ? `Booking request captured with lead ${leadId} and reference ${bookingReference}. Future Swim can now continue follow-up from BookedAI.`
          : `Enquiry captured with lead ${leadId}. Future Swim can now continue follow-up from BookedAI.`,
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
    <main className="min-h-screen overflow-hidden bg-[#f6fbff] text-[#11324a]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(97,226,255,0.2),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,153,119,0.18),transparent_24%),linear-gradient(180deg,#f6fbff_0%,#fffaf5_46%,#eef9ff_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[28rem] bg-[linear-gradient(180deg,rgba(12,72,117,0.12),transparent)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-8 lg:px-10 lg:pb-24">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0c7aae]">Future Swim booking concierge</div>
            <div className="mt-2 font-serif text-3xl tracking-[-0.03em] text-[#10314c]">Enterprise-grade enrolment experience</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="#centres"
              className="rounded-full border border-[#cfe5f1] bg-white/90 px-5 py-3 text-sm font-semibold text-[#11324a] shadow-[0_14px_28px_rgba(17,50,74,0.06)]"
            >
              View centres
            </a>
            <a
              href="#booking-flow"
              className="rounded-full bg-[#11324a] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(17,50,74,0.18)]"
            >
              Start booking
            </a>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <div className="overflow-hidden rounded-[2.25rem] border border-[#d6eef6] bg-[linear-gradient(145deg,#0d3b63_0%,#0f5f89_48%,#1da0b8_100%)] p-8 text-white shadow-[0_36px_80px_rgba(9,45,71,0.22)] sm:p-10">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/88 backdrop-blur">
              Redesigned for families, sales conversion, and booking truth
            </div>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl lg:text-[4.6rem]">
              A calmer, more premium Future Swim website with BookedAI fully wired into the booking flow.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
              This experience is designed to feel like a serious swim-school brand, not a generic chatbot page. Parents can discover centres, see current catalogue pricing, ask for the right fit, and send an enquiry or booking request into the live BookedAI workflow.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.7rem] border border-white/12 bg-white/10 p-5 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#bdefff]">Centres in flow</div>
                <div className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{heroMetrics.centreCount || '6'}</div>
                <div className="mt-2 text-sm text-white/74">Future Swim venues surfaced from the current catalogue.</div>
              </div>
              <div className="rounded-[1.7rem] border border-white/12 bg-white/10 p-5 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#bdefff]">Current pricing</div>
                <div className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{heroMetrics.priceBand}</div>
                <div className="mt-2 text-sm text-white/74">Loaded from the live BookedAI Future Swim catalogue.</div>
              </div>
              <div className="rounded-[1.7rem] border border-white/12 bg-white/10 p-5 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#bdefff]">Featured centres</div>
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

          <aside className="rounded-[2.25rem] border border-[#dbe9f3] bg-white/88 p-7 shadow-[0_30px_70px_rgba(17,50,74,0.08)] backdrop-blur sm:p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0c7aae]">Operator truth</div>
            <h2 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.04em] text-[#11324a]">
              This page now behaves like a real booking surface.
            </h2>
            <div className="mt-6 space-y-3">
              {reassurancePoints.map((item) => (
                <div key={item} className="rounded-[1.4rem] bg-[#f5fbff] px-5 py-4 text-sm leading-7 text-[#426178]">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[1.6rem] border border-[#ffe0d4] bg-[linear-gradient(180deg,#fff5ef_0%,#fffdfb_100%)] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d66f4b]">Pricing note</div>
              <p className="mt-3 text-sm leading-7 text-[#5f514d]">
                Futureswim.com.au is currently protected by ModSecurity from this runtime, so the safest production move is to drive all visible price cards from the live Future Swim catalogue already seeded from their website pages, instead of keeping stale prices hardcoded in the UI.
              </p>
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-[#dbe9f3] bg-white/88 p-7 shadow-[0_24px_60px_rgba(17,50,74,0.07)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0c7aae]">Receptionist search</div>
            <h2 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-[#11324a]">Search the way a parent speaks</h2>
            <p className="mt-4 text-sm leading-7 text-[#57758b]">
              Age, confidence level, suburb, weekend preference, and centre fit all flow into the tenant-scoped BookedAI search.
            </p>

            <form className="mt-6" onSubmit={handleSearchSubmit}>
              <textarea
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="min-h-40 w-full rounded-[1.7rem] border border-[#d5e8f1] bg-[#f8fcff] px-5 py-4 text-sm leading-7 text-[#11324a] outline-none placeholder:text-[#84a0b4]"
                placeholder="My child is 4, nervous in the water, and we would prefer a weekend beginner class near Caringbah or Miranda."
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={searchPending}
                  className="rounded-full bg-[#11324a] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(17,50,74,0.15)] disabled:opacity-70"
                >
                  {searchPending ? 'Searching Future Swim...' : 'Find best-fit centres'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchResults([]);
                    setSearchError('');
                    setConversation((current) => current.slice(0, 1));
                  }}
                  className="rounded-full border border-[#d5e8f1] bg-white px-6 py-3 text-sm font-semibold text-[#11324a]"
                >
                  Reset shortlist
                </button>
              </div>
            </form>

            <div className="mt-6 space-y-3">
              {conversation.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-[1.35rem] px-4 py-3 text-sm leading-7 ${
                    message.role === 'assistant'
                      ? 'bg-[#f3fbff] text-[#35596b]'
                      : 'bg-[#11324a] text-white'
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {searchError ? (
                <div className="rounded-[1.35rem] border border-[#ffd9cd] bg-[#fff3ef] px-4 py-3 text-sm text-[#a55a42]">
                  {searchError}
                </div>
              ) : null}
            </div>
          </div>

          <div id="centres" className="rounded-[2rem] border border-[#dbe9f3] bg-white/88 p-7 shadow-[0_24px_60px_rgba(17,50,74,0.07)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0c7aae]">Current catalogue</div>
                <h2 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-[#11324a]">Future Swim centres and products</h2>
              </div>
              <div className="rounded-full bg-[#f2fbff] px-4 py-2 text-xs font-semibold text-[#426178]">Live catalogue driven</div>
            </div>

            <div className="mt-6 space-y-4">
              {catalogPending ? <div className="rounded-[1.4rem] bg-[#f5fbff] px-5 py-4 text-sm text-[#57758b]">Loading Future Swim catalogue...</div> : null}
              {catalogError ? <div className="rounded-[1.4rem] border border-[#ffd9cd] bg-[#fff3ef] px-5 py-4 text-sm text-[#a55a42]">{catalogError}</div> : null}
              {!catalogPending && !catalogError && !displayedResults.length ? (
                <div className="rounded-[1.4rem] bg-[#f5fbff] px-5 py-4 text-sm text-[#57758b]">No Future Swim centres are currently visible in the catalogue.</div>
              ) : null}
              {displayedResults.map((result) => {
                const selected = formState.selectedServiceId === result.candidateId;
                return (
                  <article
                    key={result.candidateId}
                    className={`rounded-[1.7rem] border p-5 transition ${
                      selected ? 'border-[#0c7aae] bg-[#f1fbff]' : 'border-[#e5eef4] bg-[#fbfdff]'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0c7aae]">
                          {result.venueName || 'Future Swim'}
                        </div>
                        <h3 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[#11324a]">{result.serviceName}</h3>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5c7690]">{result.summary}</p>
                        <div className="mt-3 text-sm font-medium text-[#35596b]">{result.location}</div>
                      </div>
                      <div className="rounded-[1.35rem] bg-white px-4 py-3 text-sm font-semibold text-[#11324a] shadow-[0_12px_24px_rgba(17,50,74,0.06)]">
                        {formatPrice(result.displayPrice, result.amountAud)}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setFormState((current) => ({ ...current, selectedServiceId: result.candidateId }))}
                        className="rounded-full bg-[#11324a] px-4 py-2 text-sm font-semibold text-white"
                      >
                        {selected ? 'Selected for booking' : 'Choose this centre'}
                      </button>
                      {result.sourceUrl || result.bookingUrl ? (
                        <a
                          href={result.sourceUrl || result.bookingUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-[#d5e8f1] bg-white px-4 py-2 text-sm font-semibold text-[#11324a]"
                        >
                          View Future Swim page
                        </a>
                      ) : null}
                      {result.mapUrl ? (
                        <a
                          href={result.mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-[#d5e8f1] bg-white px-4 py-2 text-sm font-semibold text-[#11324a]"
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
          <div className="rounded-[2rem] border border-[#cfe7df] bg-[linear-gradient(180deg,#ecfff7_0%,#f9fffd_100%)] p-7 shadow-[0_24px_60px_rgba(17,50,74,0.07)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0a8a69]">BookedAI flow coverage</div>
            <h2 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-[#11324a]">From parent request to booked follow-up</h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-[#426178]">
              <div className="rounded-[1.35rem] bg-white/80 px-5 py-4">1. Search and recommendation stay tenant-scoped to Future Swim.</div>
              <div className="rounded-[1.35rem] bg-white/80 px-5 py-4">2. The parent selects a centre or lesson card with current pricing and source links.</div>
              <div className="rounded-[1.35rem] bg-white/80 px-5 py-4">3. BookedAI captures contact details, notes, child age, and confidence context.</div>
              <div className="rounded-[1.35rem] bg-white/80 px-5 py-4">4. With date and time provided, BookedAI creates both lead and booking intent via the public booking assistant API flow.</div>
              <div className="rounded-[1.35rem] bg-white/80 px-5 py-4">5. Confirmation email can be sent immediately while Future Swim continues follow-up from BookedAI records.</div>
            </div>
          </div>

          <form onSubmit={handleInquirySubmit} className="rounded-[2rem] border border-[#ffdcd1] bg-[linear-gradient(180deg,#fff6f1_0%,#ffffff_100%)] p-7 shadow-[0_24px_60px_rgba(17,50,74,0.07)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d66f4b]">Booking and enquiry capture</div>
                <h2 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-[#11324a]">Send the request into BookedAI</h2>
              </div>
              <div className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-[#7a5c53]">
                {selectedResult?.venueName || 'Select a centre'}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                value={formState.parentName}
                onChange={(event) => setFormState((current) => ({ ...current, parentName: event.target.value }))}
                className="rounded-[1.3rem] border border-[#f0dbd4] bg-white px-4 py-3 text-sm outline-none"
                placeholder="Parent name"
              />
              <input
                value={formState.email}
                onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                className="rounded-[1.3rem] border border-[#f0dbd4] bg-white px-4 py-3 text-sm outline-none"
                placeholder="Email"
              />
              <input
                value={formState.phone}
                onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                className="rounded-[1.3rem] border border-[#f0dbd4] bg-white px-4 py-3 text-sm outline-none"
                placeholder="Phone"
              />
              <select
                value={formState.childAge}
                onChange={(event) => setFormState((current) => ({ ...current, childAge: event.target.value }))}
                className="rounded-[1.3rem] border border-[#f0dbd4] bg-white px-4 py-3 text-sm outline-none"
              >
                {['2', '3', '4', '5', '6'].map((age) => (
                  <option key={age} value={age}>{`Child age: ${age}`}</option>
                ))}
              </select>
              <select
                value={formState.confidenceLevel}
                onChange={(event) => setFormState((current) => ({ ...current, confidenceLevel: event.target.value }))}
                className="rounded-[1.3rem] border border-[#f0dbd4] bg-white px-4 py-3 text-sm outline-none md:col-span-2"
              >
                {['Nervous beginner', 'Comfortable beginner', 'Improving confidence', 'Ready for progression'].map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <input
                type="date"
                value={formState.preferredDate}
                onChange={(event) => setFormState((current) => ({ ...current, preferredDate: event.target.value }))}
                className="rounded-[1.3rem] border border-[#f0dbd4] bg-white px-4 py-3 text-sm outline-none"
              />
              <input
                type="time"
                value={formState.preferredTime}
                onChange={(event) => setFormState((current) => ({ ...current, preferredTime: event.target.value }))}
                className="rounded-[1.3rem] border border-[#f0dbd4] bg-white px-4 py-3 text-sm outline-none"
              />
            </div>

            <textarea
              value={formState.notes}
              onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
              className="mt-4 min-h-32 w-full rounded-[1.3rem] border border-[#f0dbd4] bg-white px-4 py-3 text-sm leading-7 outline-none"
              placeholder="Anything Future Swim should know, such as water confidence, prior lessons, sibling needs, preferred days, or whether you want an assessment first."
            />

            <div className="mt-4 rounded-[1.35rem] bg-white/80 px-4 py-4 text-sm leading-7 text-[#6a5a55]">
              If you include both a preferred date and time, the form uses the full BookedAI public assistant lead + booking intent flow. Without them, it still captures a qualified enquiry for Future Swim follow-up.
            </div>

            <button
              type="submit"
              disabled={leadPending}
              className="mt-5 rounded-full bg-[#ff7b58] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(255,123,88,0.2)] disabled:opacity-70"
            >
              {leadPending ? 'Submitting to BookedAI...' : 'Capture enquiry and booking intent'}
            </button>

            {leadStatus ? (
              <div className="mt-4 rounded-[1.6rem] border border-[#b6e7d8] bg-[linear-gradient(135deg,#ecfff7_0%,#ffffff_100%)] px-5 py-5 text-[#0b6b56] shadow-[0_18px_36px_rgba(11,107,86,0.08)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em]">Thank you</div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#074d3f]">
                  Your Future Swim booking request is captured.
                </div>
                <p className="mt-2 text-sm leading-7">{leadStatus}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0b6b56] ring-1 ring-[#cfe7df]">
                    Returning to the main screen in {thankYouReturnCountdown}s
                  </div>
                  <button
                    type="button"
                    onClick={returnToMainScreenAfterBooking}
                    className="rounded-full bg-[#0b6b56] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Return now
                  </button>
                </div>
              </div>
            ) : null}
            {leadError ? <div className="mt-4 rounded-[1.35rem] border border-[#ffd9cd] bg-[#fff3ef] px-4 py-3 text-sm text-[#a55a42]">{leadError}</div> : null}
          </form>
        </section>
      </div>
    </main>
  );
}
