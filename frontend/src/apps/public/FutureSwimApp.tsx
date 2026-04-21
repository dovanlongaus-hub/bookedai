import { FormEvent, useEffect, useState } from 'react';

import { apiV1 } from '../../shared/api/v1';
import type { MatchCandidate } from '../../shared/contracts';

const FUTURE_SWIM_TENANT_REF = 'future-swim';

const quickPrompts = [
  'I need a gentle beginner class for my 3-year-old in the Shire.',
  'Which Future Swim centre is best for a nervous 4-year-old?',
  'Find a small-class lesson for my 5-year-old on weekends.',
  'I want to book an assessment for my child near Leichhardt.',
];

const highlightStats = [
  { value: '2-6 yrs', label: 'Core preschool age focus' },
  { value: '3:1', label: 'Beginner ratio highlighted in Future Swim FAQs' },
  { value: 'Warm pools', label: 'Comfort-first learning environment' },
  { value: 'BookedAI', label: 'Reception, sales, and booking layer' },
];

const programCards = [
  {
    title: 'Water Discovery',
    age: '2-3 years',
    body:
      'Gentle familiarisation for toddlers who need calm pacing, playful repetition, and strong parent reassurance.',
  },
  {
    title: 'Confident Beginner',
    age: '3-4 years',
    body:
      'Small-group progression focused on breath control, body position, safe entries, and early propulsion.',
  },
  {
    title: 'Independent Starter',
    age: '4-5 years',
    body:
      'Builds confidence away from the wall with repeatable routines, clear milestones, and stronger water safety habits.',
  },
  {
    title: 'Preschool Progression',
    age: '5-6 years',
    body:
      'Prepares children for consistent stroke foundations, stronger endurance, and the next level of learn-to-swim.',
  },
];

const locationCards = [
  {
    serviceId: 'future-swim-caringbah-kids-swimming-lessons',
    title: 'Caringbah',
    address: '85 Cawarra Road, Caringbah NSW 2229',
    note: 'Strong fit for Sutherland Shire families looking for small-class kids lessons.',
  },
  {
    serviceId: 'future-swim-kirrawee-kids-swimming-lessons',
    title: 'Kirrawee',
    address: '62 Waratah Street, Kirrawee NSW 2232',
    note: 'Convenient option for local weekday routines and after-school swim learning.',
  },
  {
    serviceId: 'future-swim-leichhardt-kids-swimming-lessons',
    title: 'Leichhardt',
    address: '124 Marion Street, Leichhardt NSW 2040',
    note: 'Inner-west location suited to parents wanting babies-to-children progression.',
  },
  {
    serviceId: 'future-swim-miranda-kids-swimming-lessons',
    title: 'Miranda',
    address: 'Shop 13-14 Kiora Centre, 29 Kiora Road, Miranda NSW 2228',
    note: 'A practical choice for families who want centre-based access and easy follow-up visits.',
  },
  {
    serviceId: 'future-swim-rouse-hill-kids-swimming-lessons',
    title: 'Rouse Hill',
    address: 'Unit 5, 2-4 Resolution Place, Rouse Hill NSW',
    note: 'North-west option for families wanting structured progression in a warm pool setting.',
  },
  {
    serviceId: 'future-swim-st-peters-kids-swimming-lessons',
    title: 'St Peters',
    address: 'Unit 3B, 1-7 Unwins Bridge Road, St Peters NSW 2044',
    note: 'Boutique warm-water setting with a strong first-lesson and assessment angle.',
  },
];

const trustBullets = [
  'Professional visual language built around aqua, coral, sand, and deep navy instead of generic SaaS styling.',
  'Messaging prioritises safety, small classes, calm progression, and parent confidence for children aged 2-6.',
  'BookedAI assistant is tenant-scoped to Future Swim, so it will not recommend or book outside providers.',
  'Lead capture, booking intent, email follow-up, and CRM-ready audit flow run through the BookedAI stack.',
];

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type InquiryFormState = {
  parentName: string;
  email: string;
  phone: string;
  childAge: string;
  preferredDate: string;
  preferredTime: string;
  selectedServiceId: string;
  notes: string;
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

function buildAssistantReply(results: MatchCandidate[]) {
  if (!results.length) {
    return 'I could not find a strong Future Swim match from that request yet, but I can still capture your details and route your enquiry to the right centre for a call-back.';
  }

  const top = results[0];
  const second = results[1];
  if (second) {
    return `Best current matches inside Future Swim are ${top.venueName || top.serviceName} and ${second.venueName || second.serviceName}. Pick one below and I will prepare the enquiry for booking or follow-up.`;
  }

  return `The strongest current Future Swim match is ${top.venueName || top.serviceName}. You can select it below and move straight into the enquiry or booking flow.`;
}

function formatResultPrice(result: MatchCandidate) {
  return result.displayPrice || (result.amountAud ? `A$${result.amountAud}` : 'Enquire for pricing');
}

export function FutureSwimApp() {
  const [searchQuery, setSearchQuery] = useState(quickPrompts[0]);
  const [searchResults, setSearchResults] = useState<MatchCandidate[]>([]);
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      role: 'assistant',
      content:
        'I am the Future Swim receptionist powered by BookedAI. Tell me your child’s age, confidence level, and preferred area, and I will shortlist only Future Swim options.',
    },
  ]);
  const [searchPending, setSearchPending] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [leadPending, setLeadPending] = useState(false);
  const [leadStatus, setLeadStatus] = useState('');
  const [leadError, setLeadError] = useState('');
  const [formState, setFormState] = useState<InquiryFormState>({
    parentName: '',
    email: '',
    phone: '',
    childAge: '4',
    preferredDate: '',
    preferredTime: '',
    selectedServiceId: locationCards[0].serviceId,
    notes: '',
  });

  useEffect(() => {
    document.title = 'Future Swim on BookedAI | Preschool Swim School Experience';
  }, []);

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
          widget_id: 'future-swim-receptionist',
        },
        attribution: buildAttribution(),
      });

      if (!('data' in response)) {
        throw new Error('Search request was accepted but no live shortlist was returned yet.');
      }

      const nextResults = response.data.candidates.slice(0, 4);
      setSearchResults(nextResults);
      if (nextResults[0]?.candidateId) {
        setFormState((current) => ({
          ...current,
          selectedServiceId: nextResults[0].candidateId,
        }));
      }
      setConversation((current) => [
        ...current,
        { role: 'assistant', content: buildAssistantReply(nextResults) },
      ]);
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

      const selectedResult =
        searchResults.find((item) => item.candidateId === formState.selectedServiceId) ?? null;
      const selectedLocation =
        locationCards.find((item) => item.serviceId === formState.selectedServiceId) ?? null;
      const detailNote = [
        `Child age: ${formState.childAge}`,
        formState.notes.trim() ? `Parent notes: ${formState.notes.trim()}` : null,
        selectedResult?.serviceName ? `Selected service: ${selectedResult.serviceName}` : null,
        selectedLocation?.title ? `Preferred centre: ${selectedLocation.title}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

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
          location: selectedLocation?.title || selectedResult?.venueName || null,
          service_category: 'Kids swim lessons',
        },
        attribution: buildAttribution(),
        intent_context: {
          source_page: 'future-swim-runtime',
          intent_type: 'booking_or_callback',
          notes: detailNote,
          requested_service_id: formState.selectedServiceId || null,
        },
        actor_context: buildActorContext(),
      });

      let bookingReference = '';
      if (formState.selectedServiceId) {
        const bookingResponse = await apiV1.createBookingIntent({
          service_id: formState.selectedServiceId,
          desired_slot:
            formState.preferredDate && formState.preferredTime
              ? {
                  date: formState.preferredDate,
                  time: formState.preferredTime,
                  timezone: 'Australia/Sydney',
                }
              : null,
          contact: {
            full_name: formState.parentName.trim() || 'Future Swim parent',
            email: trimmedEmail || null,
            phone: trimmedPhone || null,
            preferred_contact_method: trimmedEmail ? 'email' : 'phone',
          },
          attribution: buildAttribution(),
          channel: 'public_web',
          actor_context: buildActorContext(),
          notes: detailNote,
        });

        if ('data' in bookingResponse) {
          bookingReference = bookingResponse.data.booking_reference || '';
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
            preferred_location: selectedLocation?.title || selectedResult?.venueName || 'Future Swim',
            preferred_date: formState.preferredDate || 'To be confirmed',
            preferred_time: formState.preferredTime || 'To be confirmed',
            booking_reference: bookingReference || 'pending-follow-up',
          },
          context: {
            tenant_ref: FUTURE_SWIM_TENANT_REF,
            source_surface: 'future-swim-runtime',
          },
          actor_context: buildActorContext(),
        });
      }

      const leadId =
        'data' in leadResponse && leadResponse.data.lead_id ? leadResponse.data.lead_id : 'captured';
      setLeadStatus(
        bookingReference
          ? `Enquiry captured with lead ${leadId} and booking reference ${bookingReference}.`
          : `Enquiry captured with lead ${leadId}. The Future Swim team can now follow up from BookedAI.`,
      );
      setFormState((current) => ({
        ...current,
        notes: '',
      }));
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : 'Unable to submit enquiry right now.');
    } finally {
      setLeadPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f6fbff_0%,#fffaf1_44%,#f1f8ff_100%)] text-[#153047]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-7rem] h-72 w-72 rounded-full bg-[#9ee7ff]/45 blur-3xl" />
        <div className="absolute right-[-6rem] top-20 h-80 w-80 rounded-full bg-[#ffd48f]/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#8be0c9]/25 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#0f7db5]">
              Future Swim x BookedAI
            </div>
            <div className="mt-2 font-['Space_Grotesk'] text-2xl font-bold text-[#12314a]">
              Preschool swim school experience, reimagined
            </div>
          </div>
          <a
            href="#receptionist"
            className="rounded-full bg-[#12314a] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(18,49,74,0.18)] transition hover:bg-[#0f7db5]"
          >
            Open receptionist
          </a>
        </header>

        <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 pb-10 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-16 lg:pt-10">
          <div>
            <div className="inline-flex rounded-full border border-[#8ed7eb] bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#0f7db5]">
              Purpose-built for families with children aged 2-6
            </div>
            <h1 className="mt-6 max-w-3xl font-['Space_Grotesk'] text-5xl font-bold tracking-[-0.05em] text-[#12314a] sm:text-6xl">
              A calmer, more professional Future Swim website with a live receptionist built in.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#426178]">
              This new Future Swim runtime combines modern swim-school storytelling with the BookedAI
              engine for lead qualification, booking capture, email follow-up, and CRM-ready records.
              Every recommendation stays inside the Future Swim catalogue only.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#programs"
                className="rounded-full bg-[#ff7d5d] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(255,125,93,0.32)] transition hover:bg-[#ef6d4c]"
              >
                Explore programs
              </a>
              <a
                href="#receptionist"
                className="rounded-full border border-[#12314a]/12 bg-white/85 px-6 py-3 text-sm font-semibold text-[#12314a] transition hover:border-[#0f7db5] hover:text-[#0f7db5]"
              >
                Start with the AI receptionist
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {highlightStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_18px_45px_rgba(18,49,74,0.08)]"
                >
                  <div className="font-['Space_Grotesk'] text-2xl font-bold text-[#12314a]">{item.value}</div>
                  <div className="mt-2 text-sm leading-6 text-[#57758b]">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[36px] border border-white/70 bg-[linear-gradient(160deg,rgba(12,76,120,0.95)_0%,rgba(8,45,72,0.96)_62%,rgba(255,125,93,0.88)_145%)] p-6 text-white shadow-[0_30px_80px_rgba(12,49,74,0.28)]">
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 backdrop-blur">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#9ee7ff]">
                Theme direction
              </div>
              <h2 className="mt-4 font-['Space_Grotesk'] text-3xl font-bold tracking-[-0.04em]">
                Safety-first, premium, and family-calming
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-white/82">
                <p>
                  The visual language follows the strongest patterns seen in leading swim-school brands:
                  bright confidence colours, soft rounded geometry, clear learning pathways, and trust-led
                  language for parents.
                </p>
                <p>
                  We emphasise warm pools, small groups, age-fit progression, and human reassurance rather
                  than generic “AI chatbot” messaging.
                </p>
                <p>
                  Future Swim keeps its brand story. BookedAI becomes the receptionist, qualifier, and
                  booking engine behind the scenes.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="programs" className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#0f7db5]">Program framing</div>
              <h2 className="mt-3 font-['Space_Grotesk'] text-4xl font-bold tracking-[-0.04em] text-[#12314a]">
                Built for the 2-6 learning window
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[#57758b]">
              The site structure now speaks directly to preschool parents: water confidence, gentle
              progression, small classes, and a clear next action from enquiry to booking.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-4">
            {programCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[30px] border border-white/70 bg-white/90 p-6 shadow-[0_18px_45px_rgba(18,49,74,0.08)]"
              >
                <div className="text-sm font-semibold text-[#ff7d5d]">{card.age}</div>
                <h3 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold text-[#12314a]">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[#57758b]">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[34px] border border-white/70 bg-white/90 p-7 shadow-[0_18px_45px_rgba(18,49,74,0.08)]">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#0f7db5]">Why this works</div>
            <h2 className="mt-3 font-['Space_Grotesk'] text-4xl font-bold tracking-[-0.04em] text-[#12314a]">
              A homepage that feels like a premium swim school, not a generic brochure
            </h2>
            <div className="mt-6 space-y-4">
              {trustBullets.map((item) => (
                <div key={item} className="rounded-[24px] bg-[#f2fbff] px-5 py-4 text-sm leading-7 text-[#426178]">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-[#bde8dc] bg-[linear-gradient(180deg,#dcfff6_0%,#f9fffd_100%)] p-7 shadow-[0_18px_45px_rgba(18,49,74,0.08)]">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#07846a]">Operational stack</div>
            <h2 className="mt-3 font-['Space_Grotesk'] text-4xl font-bold tracking-[-0.04em] text-[#12314a]">
              BookedAI as receptionist, sales desk, and booking capture
            </h2>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-[#35596b]">
              <li>BookedAI shortlists only Future Swim services and venues.</li>
              <li>Each enquiry can create a lead, booking intent, and lifecycle email from one workflow.</li>
              <li>Zoho CRM syncing remains possible through the existing BookedAI integration and outbox model.</li>
              <li>Email responses can be drafted from chat-derived context while BookedAI stays the system of record.</li>
            </ul>
          </div>
        </section>

        <section id="receptionist" className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="rounded-[34px] border border-[#12314a]/10 bg-[#12314a] p-7 text-white shadow-[0_28px_80px_rgba(12,49,74,0.24)]">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#9ee7ff]">Receptionist console</div>
              <h2 className="mt-3 font-['Space_Grotesk'] text-4xl font-bold tracking-[-0.04em]">
                Search like a parent, get a Future Swim shortlist
              </h2>

              <form className="mt-6" onSubmit={handleSearchSubmit}>
                <label className="text-sm font-medium text-white/80" htmlFor="future-swim-query">
                  Ask about age, confidence, preferred suburb, or weekend needs
                </label>
                <textarea
                  id="future-swim-query"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="mt-3 min-h-36 w-full rounded-[28px] border border-white/12 bg-white/10 px-5 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/45"
                  placeholder="My child is 4, a bit nervous, and we would prefer a small beginner class near Miranda."
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setSearchQuery(prompt)}
                      className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold text-white/86 transition hover:bg-white/15"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={searchPending}
                  className="mt-5 rounded-full bg-[#9ee7ff] px-6 py-3 text-sm font-semibold text-[#093a5d] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {searchPending ? 'Searching Future Swim...' : 'Find the best Future Swim match'}
                </button>
              </form>

              <div className="mt-6 space-y-3">
                {conversation.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`rounded-[22px] px-4 py-3 text-sm leading-7 ${
                      message.role === 'assistant' ? 'bg-white/10 text-white/88' : 'bg-[#9ee7ff] text-[#093a5d]'
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
                {searchError ? (
                  <div className="rounded-[22px] border border-[#ffb7a6]/40 bg-[#ff7d5d]/12 px-4 py-3 text-sm text-[#ffd8ce]">
                    {searchError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[34px] border border-white/70 bg-white/92 p-7 shadow-[0_18px_45px_rgba(18,49,74,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#0f7db5]">Shortlist</div>
                  <h3 className="mt-2 font-['Space_Grotesk'] text-3xl font-bold tracking-[-0.04em] text-[#12314a]">
                    Current Future Swim matches
                  </h3>
                </div>
                <div className="rounded-full bg-[#f1f8ff] px-4 py-2 text-xs font-semibold text-[#426178]">
                  Tenant locked
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {(searchResults.length ? searchResults : locationCards.map((item) => ({
                  candidateId: item.serviceId,
                  serviceName: `Kids Swimming Lessons - ${item.title}`,
                  providerName: 'Future Swim',
                  sourceType: 'service_catalog',
                  venueName: `Future Swim ${item.title}`,
                  location: item.address,
                  summary: item.note,
                  displayPrice: 'Enquire for pricing',
                  bookingUrl: null,
                  mapUrl: null,
                } as MatchCandidate))).map((result) => (
                  <article
                    key={result.candidateId}
                    className={`rounded-[26px] border p-5 transition ${
                      formState.selectedServiceId === result.candidateId
                        ? 'border-[#0f7db5] bg-[#f1fbff]'
                        : 'border-[#e6eef4] bg-[#fbfdff]'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f7db5]">
                          {result.venueName || 'Future Swim venue'}
                        </div>
                        <h4 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold text-[#12314a]">
                          {result.serviceName}
                        </h4>
                        <p className="mt-3 text-sm leading-7 text-[#57758b]">
                          {result.summary || 'Future Swim lesson pathway for babies and children.'}
                        </p>
                        <div className="mt-3 text-sm font-medium text-[#35596b]">
                          {result.location || 'Sydney NSW'}
                        </div>
                      </div>
                      <div className="rounded-[22px] bg-white px-4 py-3 text-sm font-semibold text-[#12314a] shadow-[0_10px_25px_rgba(18,49,74,0.06)]">
                        {formatResultPrice(result)}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setFormState((current) => ({ ...current, selectedServiceId: result.candidateId }))
                        }
                        className="rounded-full bg-[#12314a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f7db5]"
                      >
                        Select this centre
                      </button>
                      {result.sourceUrl ? (
                        <a
                          href={result.sourceUrl}
                          className="rounded-full border border-[#12314a]/12 px-4 py-2 text-sm font-semibold text-[#12314a] transition hover:border-[#0f7db5] hover:text-[#0f7db5]"
                        >
                          View source page
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[0.94fr_1.06fr]">
          <div className="rounded-[34px] border border-white/70 bg-white/92 p-7 shadow-[0_18px_45px_rgba(18,49,74,0.08)]">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#0f7db5]">Centres</div>
            <h2 className="mt-3 font-['Space_Grotesk'] text-4xl font-bold tracking-[-0.04em] text-[#12314a]">
              Future Swim locations represented in the BookedAI catalogue
            </h2>
            <div className="mt-6 grid gap-4">
              {locationCards.map((location) => (
                <button
                  key={location.serviceId}
                  type="button"
                  onClick={() =>
                    setFormState((current) => ({ ...current, selectedServiceId: location.serviceId }))
                  }
                  className={`rounded-[24px] border px-5 py-4 text-left transition ${
                    formState.selectedServiceId === location.serviceId
                      ? 'border-[#0f7db5] bg-[#f1fbff]'
                      : 'border-[#e6eef4] bg-[#fbfdff]'
                  }`}
                >
                  <div className="font-['Space_Grotesk'] text-xl font-bold text-[#12314a]">{location.title}</div>
                  <div className="mt-2 text-sm leading-7 text-[#57758b]">{location.address}</div>
                  <div className="mt-2 text-sm text-[#35596b]">{location.note}</div>
                </button>
              ))}
            </div>
          </div>

          <form
            className="rounded-[34px] border border-[#ffd2c7] bg-[linear-gradient(180deg,#fff7f3_0%,#ffffff_100%)] p-7 shadow-[0_18px_45px_rgba(18,49,74,0.08)]"
            onSubmit={handleInquirySubmit}
          >
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#ff7d5d]">Lead and booking capture</div>
            <h2 className="mt-3 font-['Space_Grotesk'] text-4xl font-bold tracking-[-0.04em] text-[#12314a]">
              Send this straight into the BookedAI workflow
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#57758b]">
              This form can create a Future Swim lead, generate a booking intent, and trigger lifecycle
              email using the notes captured from the receptionist conversation.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                value={formState.parentName}
                onChange={(event) => setFormState((current) => ({ ...current, parentName: event.target.value }))}
                className="rounded-[22px] border border-[#f0d9d2] bg-white px-4 py-3 text-sm outline-none"
                placeholder="Parent name"
              />
              <input
                value={formState.email}
                onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                className="rounded-[22px] border border-[#f0d9d2] bg-white px-4 py-3 text-sm outline-none"
                placeholder="Email"
              />
              <input
                value={formState.phone}
                onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                className="rounded-[22px] border border-[#f0d9d2] bg-white px-4 py-3 text-sm outline-none"
                placeholder="Phone"
              />
              <select
                value={formState.childAge}
                onChange={(event) => setFormState((current) => ({ ...current, childAge: event.target.value }))}
                className="rounded-[22px] border border-[#f0d9d2] bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="2">Child age: 2</option>
                <option value="3">Child age: 3</option>
                <option value="4">Child age: 4</option>
                <option value="5">Child age: 5</option>
                <option value="6">Child age: 6</option>
              </select>
              <input
                type="date"
                value={formState.preferredDate}
                onChange={(event) => setFormState((current) => ({ ...current, preferredDate: event.target.value }))}
                className="rounded-[22px] border border-[#f0d9d2] bg-white px-4 py-3 text-sm outline-none"
              />
              <input
                type="time"
                value={formState.preferredTime}
                onChange={(event) => setFormState((current) => ({ ...current, preferredTime: event.target.value }))}
                className="rounded-[22px] border border-[#f0d9d2] bg-white px-4 py-3 text-sm outline-none"
              />
            </div>

            <textarea
              value={formState.notes}
              onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
              className="mt-4 min-h-32 w-full rounded-[22px] border border-[#f0d9d2] bg-white px-4 py-3 text-sm leading-7 outline-none"
              placeholder="Share anything the receptionist should pass through: confidence level, fears, preferred days, prior lessons, or sibling details."
            />

            <button
              type="submit"
              disabled={leadPending}
              className="mt-5 rounded-full bg-[#ff7d5d] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(255,125,93,0.24)] transition hover:bg-[#ef6d4c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {leadPending ? 'Submitting to BookedAI...' : 'Capture lead and booking intent'}
            </button>

            {leadStatus ? (
              <div className="mt-4 rounded-[22px] border border-[#bde8dc] bg-[#effff8] px-4 py-3 text-sm text-[#0b6b56]">
                {leadStatus}
              </div>
            ) : null}
            {leadError ? (
              <div className="mt-4 rounded-[22px] border border-[#ffd2c7] bg-[#fff0ea] px-4 py-3 text-sm text-[#a84b30]">
                {leadError}
              </div>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  );
}
