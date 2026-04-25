import { FormEvent, useEffect, useMemo, useState } from 'react';

import { createPublicBookingAssistantLeadAndBookingIntent } from '../../components/landing/assistant/publicBookingAssistantV1';
import { apiV1 } from '../../shared/api/v1';
import type { MatchCandidate } from '../../shared/contracts';

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type InquiryFormState = {
  customerName: string;
  email: string;
  phone: string;
  studentAge: string;
  trainingGoal: string;
  preferredFormat: string;
  preferredDate: string;
  preferredTime: string;
  selectedServiceId: string;
  notes: string;
};

type BookingAssistantCatalogResponse = {
  status?: string;
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

const TENANT_REF = 'co-mai-hung-chess-class';
const DEFAULT_SOURCE_PAGE = 'chess-grandmaster-runtime';

const quickPrompts = [
  'My child is 8 and just starting chess. What is the best beginner pathway?',
  'I want premium 1-1 online coaching with a grandmaster for tournament preparation.',
  'Which chess program suits a serious student who wants deeper 90-minute training?',
  'We want an in-person private class and are happy to pay for stronger tactical coaching.',
];

const academySignals = [
  'Grandmaster-led coaching, not generic tutoring',
  'Structured beginner to tournament pathways',
  'Online, in-person, group, and 1-1 premium formats',
  'BookedAI handles search, lead capture, booking intent, and follow-up',
];

const offerArchitecture = [
  {
    title: 'Beginner Foundations',
    format: 'Online or in-person group',
    price: 'From 260,000 VND / student / session',
    body:
      'For young learners building first-move confidence, board awareness, tactical basics, and disciplined thinking in a calm group setting.',
  },
  {
    title: 'Private Grandmaster Coaching',
    format: '1-1 online or in person',
    price: 'From 1,040,000 VND / session',
    body:
      'A premium direct-coaching path for students who need accelerated progress, sharper calculation, and highly personalised attention.',
  },
  {
    title: 'Tournament Preparation',
    format: '90-minute advanced training',
    price: 'From 1,300,000 VND / session',
    body:
      'Longer strategic sessions focused on opening understanding, calculation depth, tournament mindset, and competition readiness.',
  },
  {
    title: 'At-Home Elite Training',
    format: 'In-person premium',
    price: 'Travel surcharge 300,000 VND / session',
    body:
      'A premium home-visit option for families who want private over-the-board training with stronger schedule flexibility and direct coaching quality.',
  },
];

const initialInquiryFormState: InquiryFormState = {
  customerName: '',
  email: '',
  phone: '',
  studentAge: '8',
  trainingGoal: 'Beginner foundations',
  preferredFormat: 'Online group',
  preferredDate: '',
  preferredTime: '',
  selectedServiceId: '',
  notes: '',
};

function buildAttribution() {
  if (typeof window === 'undefined') {
    return {
      source: 'chess.bookedai.au',
      medium: 'web',
      landing_path: '/chess-grandmaster',
      referrer: null,
    };
  }

  return {
    source: window.location.hostname || 'chess.bookedai.au',
    medium: 'web',
    landing_path: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || null,
  };
}

function buildActorContext() {
  return {
    channel: 'public_web' as const,
    deployment_mode: 'standalone_app' as const,
    tenant_ref: TENANT_REF,
  };
}

function buildRuntimeConfig() {
  return {
    tenantRef: TENANT_REF,
    channel: 'public_web' as const,
    deploymentMode: 'standalone_app' as const,
    source: 'chess.bookedai.au',
    widgetId: 'grandmaster-chess-concierge',
  };
}

function buildAssistantReply(results: MatchCandidate[]) {
  if (!results.length) {
    return 'I could not find a strong chess programme match yet, but I can still capture the student brief and route it into the academy follow-up flow.';
  }

  const top = results[0];
  return `The strongest match right now is ${top.serviceName}. Continue below and I’ll turn that into a qualified enquiry or booking request.`;
}

async function fetchChessCatalog(): Promise<MatchCandidate[]> {
  const response = await fetch('/api/booking-assistant/catalog', {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load chess catalogue (${response.status}).`);
  }

  const payload = (await response.json()) as BookingAssistantCatalogResponse;
  const services = Array.isArray(payload.services) ? payload.services : [];

  return services
    .filter((service) => {
      const id = service.id ?? '';
      const name = (service.name ?? '').toLowerCase();
      const venue = (service.venue_name ?? '').toLowerCase();
      return id.includes('chess') || name.includes('chess') || venue.includes('chess');
    })
    .map((service) => ({
      candidateId: service.id ?? '',
      providerName: 'GM Mai Hung Chess Academy',
      serviceName: service.name ?? 'Chess training program',
      sourceType: 'service_catalog',
      category: service.category ?? 'Kids Services',
      summary: service.summary ?? 'Chess coaching program',
      venueName: service.venue_name ?? 'Grandmaster Chess Academy',
      location: service.location ?? 'Online or arranged venue',
      bookingUrl: service.booking_url ?? null,
      mapUrl: service.map_url ?? null,
      sourceUrl: service.source_url ?? null,
      imageUrl: service.image_url ?? null,
      amountAud: service.amount_aud ?? null,
      currencyCode: 'AUD',
      displayPrice: service.display_price ?? 'Enquire for pricing',
      tags: Array.isArray(service.tags) ? service.tags.filter(Boolean) : [],
      featured: Boolean(service.featured),
    }))
    .filter((service) => service.candidateId);
}

export function ChessGrandmasterApp() {
  const [catalogServices, setCatalogServices] = useState<MatchCandidate[]>([]);
  const [catalogPending, setCatalogPending] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [searchQuery, setSearchQuery] = useState(quickPrompts[0]);
  const [searchResults, setSearchResults] = useState<MatchCandidate[]>([]);
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      role: 'assistant',
      content:
        'Welcome to the grandmaster chess concierge. Tell me the student age, current level, and training goal, and I will prepare the strongest-fit pathway.',
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
    document.title = 'Grandmaster Chess Academy | Premium chess programs powered by BookedAI';
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
        const services = await fetchChessCatalog();
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
          setCatalogError(error instanceof Error ? error.message : 'Unable to load chess catalogue.');
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
          tenant_ref: TENANT_REF,
          widget_id: 'grandmaster-chess-concierge',
        },
        attribution: buildAttribution(),
      });

      if (!('data' in response)) {
        throw new Error('Search was accepted, but no shortlist was returned yet.');
      }

      const nextResults = response.data.candidates
        .filter((candidate) => candidate.candidateId.includes('chess') || (candidate.serviceName || '').toLowerCase().includes('chess'))
        .slice(0, 6);
      setSearchResults(nextResults);
      setFormState((current) => ({
        ...current,
        selectedServiceId: nextResults[0]?.candidateId || current.selectedServiceId,
      }));
      setConversation((current) => [...current, { role: 'assistant', content: buildAssistantReply(nextResults) }]);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Unable to search chess programs right now.');
      setConversation((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'The live shortlist is temporarily unavailable, but you can still submit the student brief below and BookedAI will capture it for academy follow-up.',
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
        throw new Error('Please provide at least an email or phone number so the academy can follow up.');
      }
      if (!selectedResult?.candidateId) {
        throw new Error('Please choose a chess programme before submitting.');
      }

      const detailNote = [
        `Student age: ${formState.studentAge}`,
        `Training goal: ${formState.trainingGoal}`,
        `Preferred format: ${formState.preferredFormat}`,
        selectedResult.serviceName ? `Selected service: ${selectedResult.serviceName}` : null,
        formState.notes.trim() ? `Notes: ${formState.notes.trim()}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      let bookingReference = '';
      let leadId = 'captured';

      if (formState.preferredDate && formState.preferredTime) {
        const authoritativeResult = await createPublicBookingAssistantLeadAndBookingIntent({
          customerName: formState.customerName.trim() || 'Chess academy parent',
          customerEmail: trimmedEmail,
          customerPhone: trimmedPhone,
          serviceId: selectedResult.candidateId,
          serviceName: selectedResult.serviceName,
          serviceCategory: selectedResult.category || 'Kids Services',
          requestedDate: formState.preferredDate,
          requestedTime: formState.preferredTime,
          timezone: 'Asia/Ho_Chi_Minh',
          sourcePage: DEFAULT_SOURCE_PAGE,
          notes: detailNote,
          runtimeConfig: buildRuntimeConfig(),
        });
        bookingReference = authoritativeResult.bookingReference || '';
        leadId = authoritativeResult.leadId || leadId;
      } else {
        const leadResponse = await apiV1.createLead({
          lead_type: 'chess_program_enquiry',
          contact: {
            full_name: formState.customerName.trim() || 'Chess academy parent',
            email: trimmedEmail || null,
            phone: trimmedPhone || null,
            preferred_contact_method: trimmedEmail ? 'email' : 'phone',
          },
          business_context: {
            business_name: 'GM Mai Hung Chess Academy',
            industry: 'Kids Services',
            location: selectedResult.location || selectedResult.venueName || null,
            service_category: 'Chess coaching',
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
          subject: 'Grandmaster Chess Academy enquiry received',
          variables: {
            parent_name: formState.customerName.trim() || 'Parent',
            child_age: formState.studentAge,
            preferred_location: selectedResult.location || selectedResult.venueName || 'Chess academy',
            preferred_date: formState.preferredDate || 'To be confirmed',
            preferred_time: formState.preferredTime || 'To be confirmed',
            booking_reference: bookingReference || 'pending-follow-up',
          },
          context: {
            tenant_ref: TENANT_REF,
            source_surface: DEFAULT_SOURCE_PAGE,
          },
          actor_context: buildActorContext(),
        });
      }

      setLeadStatus(
        bookingReference
          ? `Booking request captured with lead ${leadId} and reference ${bookingReference}.`
          : `Qualified enquiry captured with lead ${leadId}.`,
      );
      setFormState((current) => ({
        ...current,
        notes: '',
      }));
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : 'Unable to submit your chess enquiry right now.');
    } finally {
      setLeadPending(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f3eb] text-[#1f1a17]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(167,124,58,0.22),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(29,29,29,0.15),transparent_28%),linear-gradient(180deg,#f7f3eb_0%,#fdfbf7_46%,#efe7da_100%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-8 lg:px-10 lg:pb-24">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9a6a2c]">Grandmaster tenant runtime</div>
            <div className="mt-2 font-serif text-3xl tracking-[-0.03em] text-[#1f1a17]">GM Mai Hung Chess Academy</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="#programs" className="rounded-full border border-[#dfd2be] bg-white/90 px-5 py-3 text-sm font-semibold text-[#1f1a17] shadow-[0_14px_28px_rgba(31,26,23,0.06)]">Programmes</a>
            <a href="#concierge" className="rounded-full bg-[#1f1a17] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(31,26,23,0.18)]">Open concierge</a>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <div className="overflow-hidden rounded-[2.25rem] border border-[#d9cdb9] bg-[linear-gradient(145deg,#1e1916_0%,#3a2c20_46%,#8f6331_100%)] p-8 text-white shadow-[0_36px_80px_rgba(31,26,23,0.22)] sm:p-10">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/88 backdrop-blur">Luxury academic coaching for chess families</div>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl lg:text-[4.6rem]">A premium independent chess academy tenant, powered end to end by BookedAI.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">This tenant is positioned for a real grandmaster-led academy, with premium public branding, tenant-scoped search, qualified lead capture, and booking request orchestration already mapped into the BookedAI stack.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {academySignals.map((item) => (
                <div key={item} className="rounded-[1.55rem] border border-white/12 bg-white/10 px-5 py-4 text-sm leading-7 text-white/84 backdrop-blur">{item}</div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2.25rem] border border-[#e5d9c8] bg-white/88 p-7 shadow-[0_30px_70px_rgba(31,26,23,0.08)] backdrop-blur sm:p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6a2c]">Independent tenant thesis</div>
            <h2 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.04em] text-[#1f1a17]">From beginner intake to tournament-ready coaching</h2>
            <p className="mt-5 text-sm leading-7 text-[#5e544b]">The public brand should not look like `tenant1`. Internally it can still run on the seeded tenant, but externally it should present as a premium academy with clear pathways, pricing truth, and a serious coach-led positioning.</p>
            <div className="mt-6 rounded-[1.6rem] border border-[#efe2cf] bg-[linear-gradient(180deg,#fffaf3_0%,#fffdfb_100%)] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a6a2c]">Data truth</div>
              <p className="mt-3 text-sm leading-7 text-[#6b5d50]">The repo already carries the grandmaster PDF-derived pricing structure and seeded tenant credentials. This page turns that into a believable standalone commercial surface.</p>
            </div>
          </aside>
        </section>

        <section id="programs" className="mt-8 rounded-[2rem] border border-[#e5d9c8] bg-white/86 p-7 shadow-[0_24px_60px_rgba(31,26,23,0.07)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6a2c]">Offer architecture</div>
              <h2 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-[#1f1a17]">A chess academy product ladder</h2>
            </div>
            <div className="rounded-full bg-[#f8f1e5] px-4 py-2 text-xs font-semibold text-[#6b5d50]">Designed for public tenant launch</div>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-4">
            {offerArchitecture.map((offer) => (
              <article key={offer.title} className="rounded-[1.7rem] border border-[#efe4d4] bg-[linear-gradient(180deg,#fffdfa_0%,#faf4ec_100%)] p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a6a2c]">{offer.format}</div>
                <h3 className="mt-3 font-serif text-3xl tracking-[-0.04em] text-[#1f1a17]">{offer.title}</h3>
                <div className="mt-3 text-sm font-semibold text-[#6c5639]">{offer.price}</div>
                <p className="mt-4 text-sm leading-7 text-[#5e544b]">{offer.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div id="concierge" className="rounded-[2rem] border border-[#d8ccb8] bg-[#201a17] p-7 text-white shadow-[0_24px_60px_rgba(31,26,23,0.16)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#dcb06e]">Grandmaster concierge</div>
            <h2 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-white">Qualify the student in natural language</h2>
            <p className="mt-4 text-sm leading-7 text-white/74">Ask by age, level, format, or competition goal. The query stays scoped to the chess tenant, not the wider marketplace.</p>
            <form className="mt-6" onSubmit={handleSearchSubmit}>
              <textarea value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="min-h-40 w-full rounded-[1.7rem] border border-white/10 bg-white/8 px-5 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/38" />
              <div className="mt-4 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => setSearchQuery(prompt)} className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold text-white/86">{prompt}</button>
                ))}
              </div>
              <button type="submit" disabled={searchPending} className="mt-5 rounded-full bg-[#dcb06e] px-6 py-3 text-sm font-semibold text-[#231a13] disabled:opacity-70">{searchPending ? 'Searching...' : 'Find the best-fit programme'}</button>
            </form>
            <div className="mt-6 space-y-3">
              {conversation.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`rounded-[1.35rem] px-4 py-3 text-sm leading-7 ${message.role === 'assistant' ? 'bg-white/8 text-white/80' : 'bg-[#dcb06e] text-[#231a13]'}`}>{message.content}</div>
              ))}
              {searchError ? <div className="rounded-[1.35rem] border border-[#d78f71]/40 bg-[#5a2f26] px-4 py-3 text-sm text-[#ffd7cd]">{searchError}</div> : null}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#e5d9c8] bg-white/88 p-7 shadow-[0_24px_60px_rgba(31,26,23,0.07)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6a2c]">Seeded tenant catalogue</div>
                <h2 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-[#1f1a17]">Current chess services visible to BookedAI</h2>
              </div>
              <div className="rounded-full bg-[#f8f1e5] px-4 py-2 text-xs font-semibold text-[#6b5d50]">Tenant-aware shortlist</div>
            </div>
            <div className="mt-6 space-y-4">
              {catalogPending ? <div className="rounded-[1.4rem] bg-[#f8f4ed] px-5 py-4 text-sm text-[#6b5d50]">Loading chess catalogue...</div> : null}
              {catalogError ? <div className="rounded-[1.4rem] border border-[#f0d9cf] bg-[#fff4ef] px-5 py-4 text-sm text-[#a55a42]">{catalogError}</div> : null}
              {!catalogPending && !catalogError && !displayedResults.length ? <div className="rounded-[1.4rem] bg-[#f8f4ed] px-5 py-4 text-sm text-[#6b5d50]">No chess services are currently visible in the public catalogue.</div> : null}
              {displayedResults.map((result) => {
                const selected = formState.selectedServiceId === result.candidateId;
                return (
                  <article key={result.candidateId} className={`rounded-[1.7rem] border p-5 ${selected ? 'border-[#9a6a2c] bg-[#fdf7ef]' : 'border-[#ece0d0] bg-[#fffdfa]'}`}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a6a2c]">{result.venueName || 'Chess academy'}</div>
                        <h3 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[#1f1a17]">{result.serviceName}</h3>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5e544b]">{result.summary}</p>
                        <div className="mt-3 text-sm font-medium text-[#5e544b]">{result.location}</div>
                      </div>
                      <div className="rounded-[1.35rem] bg-white px-4 py-3 text-sm font-semibold text-[#1f1a17] shadow-[0_12px_24px_rgba(31,26,23,0.06)]">{result.displayPrice || 'Enquire for pricing'}</div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button type="button" onClick={() => setFormState((current) => ({ ...current, selectedServiceId: result.candidateId }))} className="rounded-full bg-[#1f1a17] px-4 py-2 text-sm font-semibold text-white">{selected ? 'Selected' : 'Choose this programme'}</button>
                      {result.bookingUrl ? <a href={result.bookingUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#e1d4c1] bg-white px-4 py-2 text-sm font-semibold text-[#1f1a17]">Open source page</a> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-[#e5d9c8] bg-[linear-gradient(180deg,#fffaf3_0%,#fffdfb_100%)] p-7 shadow-[0_24px_60px_rgba(31,26,23,0.07)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6a2c]">BookedAI flow</div>
            <h2 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-[#1f1a17]">Independent tenant operating model</h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-[#5e544b]">
              <div className="rounded-[1.35rem] bg-white/80 px-5 py-4">1. Public brand reads as a premium chess academy, not a generic tenant shell.</div>
              <div className="rounded-[1.35rem] bg-white/80 px-5 py-4">2. Search is tenant-scoped and tuned for chess programme intent.</div>
              <div className="rounded-[1.35rem] bg-white/80 px-5 py-4">3. BookedAI captures age, level, format, and training goal into the lead record.</div>
              <div className="rounded-[1.35rem] bg-white/80 px-5 py-4">4. When date and time are provided, the same flow creates an authoritative booking intent.</div>
              <div className="rounded-[1.35rem] bg-white/80 px-5 py-4">5. Email follow-up and CRM sync can sit behind the same tenant once public launch is approved.</div>
            </div>
          </div>

          <form onSubmit={handleInquirySubmit} className="rounded-[2rem] border border-[#d9cdb9] bg-[linear-gradient(180deg,#f8f1e7_0%,#ffffff_100%)] p-7 shadow-[0_24px_60px_rgba(31,26,23,0.07)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a6a2c]">Lead and booking capture</div>
                <h2 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-[#1f1a17]">Turn interest into an academy booking brief</h2>
              </div>
              <div className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-[#6b5d50]">{selectedResult?.serviceName || 'Choose a programme'}</div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input value={formState.customerName} onChange={(event) => setFormState((current) => ({ ...current, customerName: event.target.value }))} className="rounded-[1.3rem] border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none" placeholder="Parent or student name" />
              <input value={formState.email} onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))} className="rounded-[1.3rem] border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none" placeholder="Email" />
              <input value={formState.phone} onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))} className="rounded-[1.3rem] border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none" placeholder="Phone" />
              <select value={formState.studentAge} onChange={(event) => setFormState((current) => ({ ...current, studentAge: event.target.value }))} className="rounded-[1.3rem] border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none">
                {['6', '8', '10', '12', '15', 'Adult'].map((age) => <option key={age} value={age}>{`Student age: ${age}`}</option>)}
              </select>
              <select value={formState.trainingGoal} onChange={(event) => setFormState((current) => ({ ...current, trainingGoal: event.target.value }))} className="rounded-[1.3rem] border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none">
                {['Beginner foundations', 'Tactical improvement', 'Tournament preparation', 'Private premium coaching'].map((goal) => <option key={goal} value={goal}>{goal}</option>)}
              </select>
              <select value={formState.preferredFormat} onChange={(event) => setFormState((current) => ({ ...current, preferredFormat: event.target.value }))} className="rounded-[1.3rem] border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none">
                {['Online group', 'Online private', 'In-person group', 'In-person private'].map((format) => <option key={format} value={format}>{format}</option>)}
              </select>
              <input type="date" value={formState.preferredDate} onChange={(event) => setFormState((current) => ({ ...current, preferredDate: event.target.value }))} className="rounded-[1.3rem] border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none" />
              <input type="time" value={formState.preferredTime} onChange={(event) => setFormState((current) => ({ ...current, preferredTime: event.target.value }))} className="rounded-[1.3rem] border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none" />
            </div>
            <textarea value={formState.notes} onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))} className="mt-4 min-h-32 w-full rounded-[1.3rem] border border-[#eadfce] bg-white px-4 py-3 text-sm leading-7 outline-none" placeholder="Add current level, tournament ambitions, prior coaching, language preference, or any schedule constraints." />
            <div className="mt-4 rounded-[1.35rem] bg-white/80 px-4 py-4 text-sm leading-7 text-[#6b5d50]">With both date and time provided, this page uses the authoritative BookedAI lead + booking-intent path. Without them, it still captures a qualified academy enquiry.</div>
            <button type="submit" disabled={leadPending} className="mt-5 rounded-full bg-[#1f1a17] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(31,26,23,0.16)] disabled:opacity-70">{leadPending ? 'Submitting...' : 'Capture academy enquiry'}</button>
            {leadStatus ? (
              <div className="mt-4 rounded-[1.6rem] border border-[#d8c39f] bg-[linear-gradient(135deg,#fff8ec_0%,#ffffff_100%)] px-5 py-5 text-[#7a603f] shadow-[0_18px_36px_rgba(122,96,63,0.08)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em]">Thank you</div>
                <div className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[#1f1a17]">
                  Your academy booking brief is captured.
                </div>
                <p className="mt-2 text-sm leading-7">{leadStatus}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#7a603f] ring-1 ring-[#d8c39f]">
                    Returning to the main screen in {thankYouReturnCountdown}s
                  </div>
                  <button
                    type="button"
                    onClick={returnToMainScreenAfterBooking}
                    className="rounded-full bg-[#1f1a17] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Return now
                  </button>
                </div>
              </div>
            ) : null}
            {leadError ? <div className="mt-4 rounded-[1.35rem] border border-[#f0d9cf] bg-[#fff4ef] px-4 py-3 text-sm text-[#a55a42]">{leadError}</div> : null}
          </form>
        </section>
      </div>
    </main>
  );
}
