import { useEffect, useMemo, useRef, useState } from 'react';

import { apiV1 } from '../../../shared/api';
import { resolveApiErrorMessage } from '../../../shared/api/client';
import {
  createPublicBookingAssistantLeadAndBookingIntent,
  createPublicBookingAssistantSessionId,
  getPublicBookingAssistantLiveReadRecommendation,
  primePublicBookingAssistantSession,
} from '../../../components/landing/assistant/publicBookingAssistantV1';
import {
  createPublicAssistantRuntimeConfig,
} from '../../../shared/runtime/publicAssistantRuntime';
import type {
  DemoAssessmentSession,
  DemoBookingRecord,
  DemoBundleSuggestion,
  DemoMessage,
  DemoPlacementRecommendation,
  DemoService,
} from './types';
import {
  buildDefaultPreferredSlot,
  buildPreferredSlotFromPlacementSlot,
  buildBundleSuggestions,
  createDemoId,
  getPortalUrl,
  parsePreferredSlot,
  queryShowsBundleIntent,
  toDemoService,
  toPaymentOption,
  validateBookingForm,
} from './utils';
import type { DemoBookingModalStep } from './DemoBookingModal';

type BrowserSpeechRecognitionResult = {
  0: { transcript: string };
  isFinal: boolean;
  length: number;
};

type BrowserSpeechRecognitionEvent = Event & {
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
type PendingClarification = {
  baseQuery: string;
  askedCount: number;
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function hasTimingHint(query: string) {
  return /\b(today|tonight|tomorrow|weekend|this weekend|morning|afternoon|evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(
    query,
  );
}

function hasLocationHint(query: string) {
  return /\b(near me|near|in|around|bondi|sydney|cbd|parramatta|chatswood|barangaroo)\b/i.test(query);
}

function buildClarificationQuestion(query: string, askedCount: number) {
  if (askedCount >= 2) {
    return null;
  }

  if (
    /\b(swim|swimming|class|lesson|coach|coaching)\b/i.test(query) &&
    !/\b(beginner|intermediate|advanced)\b/i.test(query)
  ) {
    return 'Got it. Beginner or intermediate?';
  }

  if (/\b(tutor|tuition)\b/i.test(query) && !/\b(math|english|science|reading|writing)\b/i.test(query)) {
    return 'Sure. Which subject?';
  }

  if (/\b(cleaner|cleaning)\b/i.test(query) && !hasTimingHint(query)) {
    return 'Got it. This weekend or weekdays?';
  }

  if (/\b(haircut|salon|barber)\b/i.test(query) && !hasTimingHint(query)) {
    return 'Sure. Today or later this week?';
  }

  if (askedCount === 0 && !hasLocationHint(query)) {
    return 'Which area should I prioritize?';
  }

  return null;
}

function buildSourcePath() {
  if (typeof window === 'undefined') {
    return '/demo';
  }

  return `${window.location.pathname}${window.location.search}`;
}

function dedupeServices(services: DemoService[]) {
  const seen = new Set<string>();
  return services.filter((service) => {
    if (!service.id || seen.has(service.id)) {
      return false;
    }
    seen.add(service.id);
    return true;
  });
}

function buildAssistantSummary(params: {
  query: string;
  services: DemoService[];
  warnings: string[];
  bookingRequestSummary: string | null;
  bundleCount?: number;
}) {
  if (params.bookingRequestSummary?.trim()) {
    return params.bookingRequestSummary.trim();
  }

  if (!params.services.length) {
    return params.warnings[0] ?? `I need one more detail for "${params.query}".`;
  }

  if ((params.bundleCount ?? 0) > 0) {
    return `${params.services.length} options ready. I also found ${params.bundleCount} add-on${params.bundleCount === 1 ? '' : 's'} to bundle.`;
  }

  return `${params.services.length} option${params.services.length === 1 ? '' : 's'} ready. Pick one to book.`;
}

function parseAudAmount(value: string | null | undefined) {
  const normalized = String(value ?? '').replace(/[^0-9.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toDemoAssessmentSession(response: {
  assessment_session_id: string;
  academy_name: string;
  answered_count: number;
  total_questions: number;
  progress_percent: number;
  current_question?: DemoAssessmentSession['currentQuestion'];
  result?: DemoAssessmentSession['result'];
}): DemoAssessmentSession {
  return {
    sessionId: response.assessment_session_id,
    academyName: response.academy_name,
    answeredCount: response.answered_count,
    totalQuestions: response.total_questions,
    progressPercent: response.progress_percent,
    currentQuestion: response.current_question ?? null,
    result: response.result ?? null,
  };
}

export function useDemoBookingExperience() {
  const runtimeConfig = useMemo(
    () =>
      createPublicAssistantRuntimeConfig({
        channel: 'public_web',
        tenantRef: 'co-mai-hung-chess-class',
        deploymentMode: 'standalone_app',
        widgetId: 'demo-grandmaster-chess-academy',
        source: 'bookedai_demo_grandmaster_chess',
        medium: 'bookedai_owned_demo',
        campaign: 'grandmaster_chess_revenue_engine_demo',
        surface: 'grandmaster_chess_revenue_engine_workspace',
      }),
    [],
  );
  const sourcePath = useMemo(() => buildSourcePath(), []);
  const sessionIdRef = useRef<string>('');
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const resultsRef = useRef<DemoService[]>([]);
  const assessmentRef = useRef<DemoAssessmentSession | null>(null);
  const pendingClarificationRef = useRef<PendingClarification | null>(null);
  const userInteractedRef = useRef(false);
  const autoPlayStartedRef = useRef(false);
  const autoPlayRunningRef = useRef(false);

  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<DemoMessage[]>([
    {
      id: createDemoId('assistant'),
      role: 'assistant',
      title: 'Start here',
      body: 'Tell me the student age, current level, and goal. I will assess the fit, place the student, and open the right chess pathway.',
    },
  ]);
  const [results, setResults] = useState<DemoService[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [assessment, setAssessment] = useState<DemoAssessmentSession | null>(null);
  const [assessmentPending, setAssessmentPending] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');
  const [placement, setPlacement] = useState<DemoPlacementRecommendation | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [bundleSuggestions, setBundleSuggestions] = useState<DemoBundleSuggestion[]>([]);
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [preferredSlot, setPreferredSlot] = useState(buildDefaultPreferredSlot());
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState<DemoBookingRecord | null>(null);
  const [searchSummary, setSearchSummary] = useState<{
    paymentAllowedBeforeConfirmation: boolean;
    bookingPath: string | null;
    nextStep: string | null;
  } | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [assistantTyping, setAssistantTyping] = useState(false);
  const [pendingClarification, setPendingClarification] = useState<PendingClarification | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingModalStep, setBookingModalStep] = useState<DemoBookingModalStep>('details');
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  useEffect(() => {
    sessionIdRef.current = createPublicBookingAssistantSessionId();
    void primePublicBookingAssistantSession({
      sourcePage: sourcePath,
      anonymousSessionId: sessionIdRef.current,
      runtimeConfig,
    });
  }, [runtimeConfig, sourcePath]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem('bookedai-demo-profile');
      if (!raw) {
        return;
      }

      const profile = JSON.parse(raw) as {
        customerName?: string;
        customerEmail?: string;
        customerPhone?: string;
      };

      if (profile.customerName) setCustomerName(profile.customerName);
      if (profile.customerEmail) setCustomerEmail(profile.customerEmail);
      if (profile.customerPhone) setCustomerPhone(profile.customerPhone);
    } catch {
      // Ignore bad local profile data.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      'bookedai-demo-profile',
      JSON.stringify({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
      }),
    );
  }, [customerEmail, customerName, customerPhone]);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    assessmentRef.current = assessment;
  }, [assessment]);

  useEffect(() => {
    pendingClarificationRef.current = pendingClarification;
  }, [pendingClarification]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const recognitionConstructor =
      'SpeechRecognition' in window
        ? (window as Window & { SpeechRecognition: BrowserSpeechRecognitionConstructor })
            .SpeechRecognition
        : 'webkitSpeechRecognition' in window
          ? (window as Window & { webkitSpeechRecognition: BrowserSpeechRecognitionConstructor })
              .webkitSpeechRecognition
          : null;

    if (!recognitionConstructor) {
      setVoiceSupported(false);
      return;
    }

    setVoiceSupported(true);
    const recognition = new recognitionConstructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-AU';

    recognition.onstart = () => {
      setVoiceListening(true);
      setSearchError('');
    };

    recognition.onend = () => {
      setVoiceListening(false);
    };

    recognition.onerror = () => {
      setVoiceListening(false);
      setSearchError('Voice is not working right now. Keep typing.');
    };

    recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();

      if (transcript) {
        setDraft(transcript);
        const finalResult = event.results[event.results.length - 1];
        if (finalResult?.isFinal) {
          void submitSearch(transcript);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const selectedService = useMemo(
    () => results.find((service) => service.id === selectedServiceId) ?? null,
    [results, selectedServiceId],
  );
  const selectedBundles = useMemo(
    () => bundleSuggestions.filter((suggestion) => selectedBundleIds.includes(suggestion.id)),
    [bundleSuggestions, selectedBundleIds],
  );

  function pushMessage(message: Omit<DemoMessage, 'id'>) {
    setMessages((current) => [...current, { ...message, id: createDemoId(message.role) }]);
  }

  function markUserInteracted() {
    if (autoPlayRunningRef.current) {
      return;
    }

    userInteractedRef.current = true;
  }

  function reorderServicesForPlacement(
    services: DemoService[],
    recommendation: DemoPlacementRecommendation,
  ) {
    const bookingReady = new Set(recommendation.booking_ready_candidate_ids);
    const fallback = new Set(recommendation.fallback_candidate_ids);

    return [...services].sort((left, right) => {
      const leftRecommended = left.id === recommendation.recommended_candidate_id ? 0 : 1;
      const rightRecommended = right.id === recommendation.recommended_candidate_id ? 0 : 1;
      if (leftRecommended !== rightRecommended) {
        return leftRecommended - rightRecommended;
      }

      const leftReady = bookingReady.has(left.id) ? 0 : 1;
      const rightReady = bookingReady.has(right.id) ? 0 : 1;
      if (leftReady !== rightReady) {
        return leftReady - rightReady;
      }

      const leftFallback = fallback.has(left.id) ? 0 : 1;
      const rightFallback = fallback.has(right.id) ? 0 : 1;
      return leftFallback - rightFallback;
    });
  }

  async function resolvePlacementForResults(params: {
    assessmentSessionId: string;
    services: DemoService[];
  }) {
    const placementResponse = await apiV1.resolvePlacement({
      assessment_session_id: params.assessmentSessionId,
      participant: {
        student_age: /\b([5-9]|1[0-7])\b/.test(currentQuery)
          ? Number(currentQuery.match(/\b([5-9]|1[0-7])\b/)?.[0] ?? '8')
          : 8,
      },
      actor_context: {
        channel: runtimeConfig.channel ?? 'public_web',
        tenant_ref: runtimeConfig.tenantRef ?? null,
        deployment_mode: runtimeConfig.deploymentMode ?? 'standalone_app',
      },
    });

    if (!('data' in placementResponse)) {
      throw new Error('Placement is still being prepared.');
    }

    const recommendation = placementResponse.data.recommendation;
    const fallbackIds = params.services.slice(1).map((service) => service.id);
    const synthesizedRecommendation = {
      ...recommendation,
      recommended_candidate_id: params.services[0]?.id ?? null,
      fallback_candidate_ids: fallbackIds,
      booking_ready_candidate_ids: params.services.map((service) => service.id),
    };
    setPlacement(synthesizedRecommendation);
    const reordered = reorderServicesForPlacement(params.services, synthesizedRecommendation);
    setResults(reordered);
    setSelectedServiceId(
      synthesizedRecommendation.recommended_candidate_id &&
        reordered.some((service) => service.id === synthesizedRecommendation.recommended_candidate_id)
        ? synthesizedRecommendation.recommended_candidate_id
        : reordered[0]?.id ?? null,
    );
    const recommendedSlot = synthesizedRecommendation.available_slots[0];
    const nextPreferredSlot = recommendedSlot
      ? buildPreferredSlotFromPlacementSlot(recommendedSlot)
      : null;
    if (nextPreferredSlot) {
      setPreferredSlot(nextPreferredSlot);
    }
    pushMessage({
      role: 'assistant',
      title: 'Placement ready',
      body: `${synthesizedRecommendation.class_label} is the strongest fit. ${synthesizedRecommendation.suggested_plan.title} is the recommended plan.`,
      tone: 'success',
    });
  }

  async function answerAssessment(optionId: string, options?: { suppressInteraction?: boolean }) {
    if (!assessment?.sessionId) {
      return;
    }

    if (!options?.suppressInteraction) {
      markUserInteracted();
    }

    setAssessmentPending(true);
    setAssessmentError('');

    const currentQuestion = assessment.currentQuestion;
    const selectedOption = currentQuestion?.options.find((option) => option.option_id === optionId) ?? null;
    if (selectedOption) {
      pushMessage({
        role: 'user',
        body: selectedOption.label,
      });
    }

    try {
      const response = await apiV1.answerAssessmentSession(assessment.sessionId, {
        question_id: currentQuestion?.question_id ?? '',
        answer_id: optionId,
        actor_context: {
          channel: runtimeConfig.channel ?? 'public_web',
          tenant_ref: runtimeConfig.tenantRef ?? null,
          deployment_mode: runtimeConfig.deploymentMode ?? 'standalone_app',
        },
      });

      if (!('data' in response)) {
        throw new Error('Assessment answer was accepted, but the next step is not ready yet.');
      }

      const nextAssessment = toDemoAssessmentSession(response.data);
      setAssessment(nextAssessment);

      if (nextAssessment.result) {
        pushMessage({
          role: 'assistant',
          title: 'Assessment complete',
          body: nextAssessment.result.summary,
          tone: 'success',
        });

        const currentResults = resultsRef.current.length ? resultsRef.current : results;
        if (currentResults.length) {
          await resolvePlacementForResults({
            assessmentSessionId: nextAssessment.sessionId,
            services: currentResults,
          });
        }
      }
    } catch (error) {
      const message = resolveApiErrorMessage(error, 'Assessment could not continue right now.');
      setAssessmentError(message);
      pushMessage({
        role: 'system',
        title: 'Assessment stalled',
        body: message,
        tone: 'warning',
      });
    } finally {
      setAssessmentPending(false);
    }
  }

  async function submitSearch(
    queryInput?: string,
    options?: {
      mode?: 'new' | 'followup';
      suppressInteraction?: boolean;
    },
  ) {
    const normalizedMode = options?.mode ?? (pendingClarification && !queryInput ? 'followup' : 'new');
    const rawQuery = (queryInput ?? draft).trim();
    const query =
      normalizedMode === 'followup' && pendingClarification
        ? `${pendingClarification.baseQuery} ${rawQuery}`.trim()
        : rawQuery;
    if (!query) {
      return;
    }

    if (!options?.suppressInteraction) {
      markUserInteracted();
    }

    setSearching(true);
    setAssistantTyping(true);
    setSearchError('');
    setBooking(null);
    setResults([]);
    setCurrentQuery(query);
    setWarnings([]);
    setAssessment(null);
    setAssessmentError('');
    setPlacement(null);
    setSelectedServiceId(null);
    setBundleSuggestions([]);
    setSelectedBundleIds([]);
    setSearchSummary(null);
    pushMessage({ role: 'user', body: rawQuery || query });

    try {
      const liveRead = await getPublicBookingAssistantLiveReadRecommendation({
        sourcePage: sourcePath,
        query,
        locationHint: null,
        serviceCategory: null,
        selectedServiceId: null,
        runtimeConfig,
      });

      const services = dedupeServices(liveRead.rankedCandidates.map(toDemoService));
      const nextSuggestedService =
        liveRead.suggestedServiceId && services.some((service) => service.id === liveRead.suggestedServiceId)
          ? services.find((service) => service.id === liveRead.suggestedServiceId) ?? services[0] ?? null
          : services[0] ?? null;
      const nextBundleSuggestions = services.length
        ? buildBundleSuggestions({
            query,
            selectedService: nextSuggestedService,
          })
        : [];
      const assistantMessage = buildAssistantSummary({
        query,
        services,
        warnings: liveRead.warnings,
        bookingRequestSummary: liveRead.bookingRequestSummary,
        bundleCount: nextBundleSuggestions.length,
      });

      resultsRef.current = services;
      setResults(services);
      setBundleSuggestions(nextBundleSuggestions);
      setWarnings(liveRead.warnings);
      setSearchSummary(
        liveRead.bookingPathSummary
          ? {
              paymentAllowedBeforeConfirmation:
                liveRead.bookingPathSummary.paymentAllowedBeforeConfirmation,
              bookingPath: liveRead.bookingPathSummary.pathType,
              nextStep: liveRead.bookingPathSummary.nextStep,
            }
          : null,
      );

      const suggestedServiceId =
        liveRead.suggestedServiceId && services.some((service) => service.id === liveRead.suggestedServiceId)
          ? liveRead.suggestedServiceId
          : services[0]?.id ?? null;
      setSelectedServiceId(suggestedServiceId);
      if (queryShowsBundleIntent(query) && nextBundleSuggestions[0]) {
        setSelectedBundleIds([nextBundleSuggestions[0].id]);
      }

      try {
        const assessmentResponse = await apiV1.createAssessmentSession({
          participant: {
            student_age: /\b([5-9]|1[0-7])\b/.test(query) ? Number(query.match(/\b([5-9]|1[0-7])\b/)?.[0] ?? '8') : 8,
          },
          context: {
            query,
            source_page: sourcePath,
          },
          actor_context: {
            channel: runtimeConfig.channel ?? 'public_web',
            tenant_ref: runtimeConfig.tenantRef ?? null,
            deployment_mode: runtimeConfig.deploymentMode ?? 'standalone_app',
          },
        });

        if ('data' in assessmentResponse) {
          const nextAssessment = toDemoAssessmentSession(assessmentResponse.data);
          setAssessment(nextAssessment);
        }
      } catch (error) {
        const assessmentMessage = resolveApiErrorMessage(
          error,
          'Assessment is not available right now. You can still review the shortlist.',
        );
        setAssessmentError(assessmentMessage);
        pushMessage({
          role: 'system',
          title: 'Assessment delayed',
          body: assessmentMessage,
          tone: 'warning',
        });
      }

      const nextAskedCount =
        normalizedMode === 'followup' && pendingClarification ? pendingClarification.askedCount + 1 : 1;
      const clarificationQuestion = buildClarificationQuestion(
        query,
        normalizedMode === 'followup' && pendingClarification ? pendingClarification.askedCount : 0,
      );

      await wait(380);

      pushMessage({
        role: 'assistant',
        title: services.length ? 'Results' : 'Need one detail',
        body:
          clarificationQuestion ??
          (services.length
            ? `${assistantMessage} I’ll place the student first so the academy recommendation stays accurate.`
            : assistantMessage),
        tone: services.length ? 'success' : 'warning',
      });

      if (clarificationQuestion) {
        setPendingClarification({
          baseQuery: query,
          askedCount: nextAskedCount,
        });
      } else {
        setPendingClarification(null);
      }
    } catch (error) {
      const message = resolveApiErrorMessage(error, 'We could not load results right now.');
      setSearchError(message);
      pushMessage({
        role: 'system',
        title: 'Could not load results',
        body: message,
        tone: 'warning',
      });
    } finally {
      setSearching(false);
      setAssistantTyping(false);
      setDraft('');
    }
  }

  function startVoiceInput() {
    markUserInteracted();

    if (!recognitionRef.current || voiceListening) {
      return;
    }

    try {
      recognitionRef.current.start();
    } catch {
      setSearchError('Voice could not start. Keep typing.');
    }
  }

  function chooseService(serviceId: string, suppressInteraction = false) {
    if (!suppressInteraction) {
      markUserInteracted();
    }

    const nextService = results.find((service) => service.id === serviceId);
    setSelectedServiceId(serviceId);
    setBooking(null);
    setSubmitError('');
    if (!nextService) {
      return;
    }

    const nextBundleSuggestions = buildBundleSuggestions({
      query: currentQuery,
      selectedService: nextService,
    });
    setBundleSuggestions(nextBundleSuggestions);
    setSelectedBundleIds((current) =>
      current.filter((bundleId) => nextBundleSuggestions.some((suggestion) => suggestion.id === bundleId)),
    );

    pushMessage({
      role: 'assistant',
      title: 'Picked',
      body: !placement
        ? `I have your shortlist. Complete the assessment first so I can place the student into the right class before booking.`
        : nextBundleSuggestions.length > 0
          ? `${nextService.name} is ready. You can bundle ${nextBundleSuggestions[0].title.toLowerCase()} too.`
          : nextService.nextStep ?? `${nextService.name} is ready. Add your details and time.`,
    });
  }

  function toggleBundleSuggestion(bundleId: string) {
    markUserInteracted();
    const suggestion = bundleSuggestions.find((item) => item.id === bundleId);
    if (!suggestion) {
      return;
    }

    setSelectedBundleIds((current) => {
      const exists = current.includes(bundleId);
      return exists ? current.filter((id) => id !== bundleId) : [...current, bundleId];
    });

    pushMessage({
      role: 'assistant',
      title: 'Bundle updated',
      body: selectedBundleIds.includes(bundleId)
        ? `${suggestion.title} removed from this booking.`
        : `${suggestion.title} added to this booking.`,
      tone: 'success',
    });
  }

  function openBookingModal(serviceId?: string, suppressInteraction = false) {
    if (!suppressInteraction) {
      markUserInteracted();
    }

    if (serviceId) {
      chooseService(serviceId, true);
    }
    if (!placement) {
      setSubmitError('Complete the assessment first so BookedAI can place the student into the right class.');
      pushMessage({
        role: 'system',
        title: 'Assessment required',
        body: 'Finish the placement step first. Then I will open booking and payment.',
        tone: 'warning',
      });
      return;
    }
    setSubmitError('');
    setBooking(null);
    setPaymentProcessing(false);
    setBookingModalStep('details');
    setBookingModalOpen(true);
  }

  function closeBookingModal() {
    markUserInteracted();
    setBookingModalOpen(false);
    setPaymentProcessing(false);
    setSubmitError('');
  }

  async function submitBooking(options?: { suppressInteraction?: boolean }) {
    if (!options?.suppressInteraction) {
      markUserInteracted();
    }

    if (!selectedService) {
      setSubmitError('Pick a result first.');
      return;
    }

    const validationError = validateBookingForm({
      customerName,
      customerEmail,
      customerPhone,
      preferredSlot,
    });
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    const slot = parsePreferredSlot(preferredSlot);
    if (!slot) {
      setSubmitError('Choose a valid preferred time.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const authoritative = await createPublicBookingAssistantLeadAndBookingIntent({
        sourcePage: sourcePath,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        serviceCategory: selectedService.category,
        customerName,
        customerEmail: customerEmail.trim() ? customerEmail.trim().toLowerCase() : null,
        customerPhone: customerPhone.trim() || null,
        notes:
          [
            notes.trim(),
            placement
              ? `Assessment placement: ${placement.class_label} (${placement.level}). Recommended plan: ${placement.suggested_plan.title}.`
              : '',
            selectedBundles.length
              ? `Requested bundle add-ons: ${selectedBundles.map((bundle) => bundle.title).join(', ')}.`
              : '',
          ]
            .filter(Boolean)
            .join(' ')
            .trim() || null,
        requestedDate: slot.requestedDate,
        requestedTime: slot.requestedTime,
        timezone: 'Australia/Sydney',
        runtimeConfig,
      });

      let paymentStatus = 'pending';
      let checkoutUrl: string | null = null;
      let paymentWarnings: string[] = [];
      const paymentOption = toPaymentOption({
        paymentAllowedBeforeConfirmation:
          searchSummary?.paymentAllowedBeforeConfirmation ?? authoritative.trust.payment_allowed_now,
        bookingPath:
          searchSummary?.bookingPath ?? authoritative.trust.recommended_booking_path ?? null,
      });

      try {
        const paymentIntentResponse = await apiV1.createPaymentIntent({
          booking_intent_id: authoritative.bookingIntentId,
          selected_payment_option: paymentOption,
          actor_context: {
            channel: runtimeConfig.channel ?? 'public_web',
            tenant_ref: runtimeConfig.tenantRef ?? null,
            deployment_mode: runtimeConfig.deploymentMode ?? 'standalone_app',
          },
        });

        if ('data' in paymentIntentResponse) {
          paymentStatus = paymentIntentResponse.data.payment_status;
          checkoutUrl = paymentIntentResponse.data.checkout_url ?? null;
          paymentWarnings = paymentIntentResponse.data.warnings ?? [];
        }
      } catch (error) {
        paymentWarnings = [resolveApiErrorMessage(error, 'Payment is not ready yet.')];
      }

      const bookingReference =
        authoritative.bookingReference?.trim() || authoritative.bookingIntentId;
      let reportPreview: DemoBookingRecord['reportPreview'] = null;
      let subscriptionIntent: DemoBookingRecord['subscriptionIntent'] = null;
      let revenueAgentActions: DemoBookingRecord['revenueAgentActions'] = [];
      if (placement && assessment?.result) {
        try {
          const reportResponse = await apiV1.createAcademyReportPreview({
            booking_reference: bookingReference,
            participant: {
              student_name: customerName.trim() || 'Student',
              student_age: /\b([5-9]|1[0-7])\b/.test(currentQuery)
                ? Number(currentQuery.match(/\b([5-9]|1[0-7])\b/)?.[0] ?? '8')
                : 8,
              guardian_name: customerName.trim() || 'Parent',
            },
            assessment: assessment.result,
            placement,
            service_name: selectedService.name,
            actor_context: {
              channel: runtimeConfig.channel ?? 'public_web',
              tenant_ref: runtimeConfig.tenantRef ?? null,
              deployment_mode: runtimeConfig.deploymentMode ?? 'standalone_app',
            },
          });

          if ('data' in reportResponse) {
            reportPreview = reportResponse.data.report_preview;
            const subscriptionResponse = await apiV1.createSubscriptionIntent({
              student_ref: reportResponse.data.student_ref,
              booking_reference: bookingReference,
              booking_intent_id: authoritative.bookingIntentId,
              plan: {
                plan_code: placement.suggested_plan.plan_key,
                plan_label: placement.suggested_plan.title,
                amount_aud: parseAudAmount(placement.suggested_plan.price_label),
                billing_interval: 'month',
              },
              placement,
              actor_context: {
                channel: runtimeConfig.channel ?? 'public_web',
                tenant_ref: runtimeConfig.tenantRef ?? null,
                deployment_mode: runtimeConfig.deploymentMode ?? 'standalone_app',
              },
              context: {
                source_page: sourcePath,
                booking_reference: bookingReference,
              },
            });
            if ('data' in subscriptionResponse) {
              subscriptionIntent = subscriptionResponse.data.subscription_intent;
              revenueAgentActions = subscriptionResponse.data.queued_actions;
            }
          }
        } catch {
          // Keep booking successful even if academy continuity generation is delayed.
        }
      }

      const nextBooking: DemoBookingRecord = {
        bookingIntentId: authoritative.bookingIntentId,
        bookingReference,
        portalUrl: getPortalUrl(bookingReference),
        checkoutUrl,
        paymentStatus,
        paymentOption,
        paymentWarnings,
        completionState: checkoutUrl ? 'payment_opened' : 'awaiting_confirmation',
        authoritative,
        reportPreview,
        subscriptionIntent,
        revenueAgentActions,
      };

      setBooking(nextBooking);
      setBookingModalStep('payment');
      pushMessage({
        role: 'assistant',
        title: 'Booking ready',
        body: checkoutUrl
          ? `${bookingReference} is ready. Pay now to lock it in.`
          : subscriptionIntent
            ? `${bookingReference} is ready. The ${subscriptionIntent.plan_label ?? 'academy plan'} handoff is queued for revenue operations.`
            : `${bookingReference} is ready. We will confirm the payment step next.`,
        tone: 'success',
      });
    } catch (error) {
      const message = resolveApiErrorMessage(error, 'We could not create the booking right now.');
      setSubmitError(message);
      pushMessage({
        role: 'system',
        title: 'Could not create booking',
        body: message,
        tone: 'warning',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmPaymentInline(options?: { suppressInteraction?: boolean }) {
    if (!options?.suppressInteraction) {
      markUserInteracted();
    }

    if (!booking) {
      return;
    }

    setPaymentProcessing(true);
    await wait(480);
    if (booking.checkoutUrl && !options?.suppressInteraction && typeof window !== 'undefined') {
      window.open(booking.checkoutUrl, '_blank', 'noopener,noreferrer');
    }
    setBooking((current) => {
      if (!current) {
        return current;
      }

      if (current.checkoutUrl) {
        return {
          ...current,
          paymentStatus:
            current.paymentStatus === 'pending' ? 'requires_action' : current.paymentStatus,
          completionState: 'payment_opened',
        };
      }

      return {
        ...current,
        paymentStatus:
          current.paymentStatus === 'pending' ? 'pending' : current.paymentStatus,
        completionState: 'awaiting_confirmation',
      };
    });
    setPaymentProcessing(false);
    setBookingModalStep('success');
    pushMessage({
      role: 'assistant',
      title: booking.checkoutUrl ? 'Payment opened' : 'Booking sent',
      body: booking.checkoutUrl
        ? `Secure payment is open for ${booking.bookingReference}. Finish checkout to lock it in.`
        : `${booking.bookingReference} is in the queue. We will confirm the next payment step shortly.`,
      tone: 'success',
    });
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleUserIntent = () => {
      if (autoPlayRunningRef.current || autoPlayStartedRef.current) {
        return;
      }
      userInteractedRef.current = true;
    };

    window.addEventListener('pointerdown', handleUserIntent, { passive: true });
    window.addEventListener('keydown', handleUserIntent);

    const timeoutId = window.setTimeout(() => {
      if (userInteractedRef.current || autoPlayStartedRef.current) {
        return;
      }

      autoPlayStartedRef.current = true;
      autoPlayRunningRef.current = true;
      setIsAutoPlaying(true);

      void (async () => {
        try {
          const demoQuery = 'Chess classes for my 8 year old in Sydney';

          setDraft('');
          for (const character of demoQuery) {
            setDraft((current) => `${current}${character}`);
            await wait(45);
          }

          await wait(280);
          await submitSearch(demoQuery, { mode: 'new', suppressInteraction: true });
          await wait(1200);

          if (pendingClarificationRef.current) {
            await submitSearch('Beginner', { mode: 'followup', suppressInteraction: true });
            await wait(1200);
          }

          const scriptedAssessmentAnswers = ['beginner', 'knows_rules', 'mate_in_1', 'needs_guidance'];
          for (const optionId of scriptedAssessmentAnswers) {
            if (!assessmentRef.current?.currentQuestion) {
              break;
            }
            await answerAssessment(optionId, { suppressInteraction: true });
            await wait(900);
          }

          const firstResultId = resultsRef.current[0]?.id;
          if (!firstResultId) {
            return;
          }

          openBookingModal(firstResultId, true);
          await wait(520);

          setCustomerName('Mia Johnson');
          setCustomerEmail('mia@example.com');
          setCustomerPhone('+61412345678');
          await wait(420);

          await submitBooking({ suppressInteraction: true });
          await wait(980);

          await confirmPaymentInline({ suppressInteraction: true });
        } finally {
          autoPlayRunningRef.current = false;
          setIsAutoPlaying(false);
        }
      })();
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('pointerdown', handleUserIntent);
      window.removeEventListener('keydown', handleUserIntent);
    };
  }, []);

  return {
    draft,
    setDraft,
    messages,
    results,
    currentQuery,
    warnings,
    assessment,
    assessmentPending,
    assessmentError,
    placement,
    bundleSuggestions,
    selectedBundles,
    selectedService,
    selectedServiceId,
    searching,
    submitting,
    searchError,
    submitError,
    customerName,
    setCustomerName,
    customerEmail,
    setCustomerEmail,
    customerPhone,
    setCustomerPhone,
    preferredSlot,
    setPreferredSlot,
    notes,
    setNotes,
    booking,
    bookingModalOpen,
    bookingModalStep,
    paymentProcessing,
    isAutoPlaying,
    assistantTyping,
    voiceSupported,
    voiceListening,
    submitSearch,
    answerAssessment,
    startVoiceInput,
    chooseService,
    toggleBundleSuggestion,
    openBookingModal,
    closeBookingModal,
    submitBooking,
    confirmPaymentInline,
  };
}
