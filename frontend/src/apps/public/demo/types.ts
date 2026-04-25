import type { MatchCandidate } from '../../../shared/contracts';
import type { PublicBookingAssistantAuthoritativeBookingIntentResult } from '../../../components/landing/assistant/publicBookingAssistantV1';
import type {
  AcademyReportPreview,
  AssessmentQuestion,
  AssessmentResult,
  CreateSubscriptionIntentResponse,
  ResolvePlacementResponse,
} from '../../../shared/contracts';

export type DemoMessageRole = 'user' | 'assistant' | 'system';

export type DemoMessage = {
  id: string;
  role: DemoMessageRole;
  title?: string;
  body: string;
  tone?: 'default' | 'success' | 'warning';
};

export type DemoFlowStage = 'chat' | 'assessment' | 'placement' | 'results' | 'booking' | 'report';

export type DemoAssessmentSession = {
  sessionId: string;
  academyName: string;
  answeredCount: number;
  totalQuestions: number;
  progressPercent: number;
  currentQuestion: AssessmentQuestion | null;
  result: AssessmentResult | null;
};

export type DemoPlacementRecommendation = ResolvePlacementResponse['recommendation'];
export type DemoProgressReportPreview = AcademyReportPreview;

export type DemoService = {
  id: string;
  name: string;
  category: string;
  summary: string;
  location: string | null;
  imageUrl: string | null;
  rating: number;
  reviewCount: number;
  priceLabel: string;
  amountAud: number | null;
  durationMinutes: number | null;
  availabilitySlots: string[];
  providerCountLabel: string;
  bookedTodayLabel: string;
  ratingLabel: string;
  sourceLabel: string;
  sourceType: string | null;
  confidenceLabel: string;
  nextStep: string | null;
  whyThisMatches: string | null;
  bookingPathType: string | null;
  bookingConfidence: string | null;
  trustSignal: string | null;
  candidate: MatchCandidate;
};

export type DemoBundleSuggestion = {
  id: string;
  title: string;
  summary: string;
  priceLabel: string;
  timingLabel: string;
  trustLabel: string;
  category: string;
};

export type DemoSearchResult = {
  assistantMessage: string;
  services: DemoService[];
  warnings: string[];
  suggestedServiceId: string | null;
  bookingSummary: {
    paymentAllowedBeforeConfirmation: boolean;
    bookingPath: string | null;
    nextStep: string | null;
  } | null;
};

export type DemoBookingRecord = {
  bookingIntentId: string;
  bookingReference: string;
  portalUrl: string;
  checkoutUrl: string | null;
  paymentStatus: string;
  paymentOption: string;
  paymentWarnings: string[];
  completionState: 'payment_opened' | 'awaiting_confirmation' | 'paid';
  authoritative: PublicBookingAssistantAuthoritativeBookingIntentResult;
  reportPreview?: DemoProgressReportPreview | null;
  subscriptionIntent?: CreateSubscriptionIntentResponse['subscription_intent'] | null;
  revenueAgentActions?: CreateSubscriptionIntentResponse['queued_actions'];
};
