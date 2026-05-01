export type FutureSwimAttendance = 0 | 1 | 2;

export type FutureSwimProgressEntry = {
  session_date: string | null;
  centre_code: string | null;
  level_code: string | null;
  attendance: FutureSwimAttendance | null;
  focus_skill: string | null;
  notes_md: string | null;
  coach_initials: string | null;
};

export type FutureSwimEvaluation = {
  evaluated_at: string | null;
  level_code: string | null;
  level_outcome: 'progressed' | 'hold' | 'review_in_4_weeks' | string | null;
  strengths_md: string | null;
  areas_to_work_on_md: string | null;
  next_step_level_code: string | null;
  next_step_summary: string | null;
  coach_initials: string | null;
};

export type FutureSwimStudentSummary = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  centre_code: string | null;
  current_level_code: string | null;
  enrolled_since: string | null;
  notes_for_coach: string | null;
  recent_progress: FutureSwimProgressEntry[];
  latest_evaluation: FutureSwimEvaluation | null;
};

export type FutureSwimParentSummary = {
  email: string;
  full_name: string | null;
  phone: string | null;
  centre_code: string | null;
  preferred_locale: string | null;
};

export type FutureSwimBookingSummary = {
  booking_intent_id: string;
  booking_reference: string | null;
  requested_date: string | null;
  requested_time: string | null;
  timezone: string | null;
  service_id: string | null;
  service_name: string | null;
  venue_name: string | null;
  display_price: string | null;
  status: string | null;
  created_at: string | null;
};

export type FutureSwimPortalPayload = {
  parent: FutureSwimParentSummary;
  students: FutureSwimStudentSummary[];
  bookings?: FutureSwimBookingSummary[];
};

export type FutureSwimPortalResponse =
  | { status: 'ok'; data: FutureSwimPortalPayload; meta?: unknown }
  | { status: 'error'; data?: never; message?: string; meta?: unknown };

export const FUTURE_SWIM_DEMO_PORTAL_KEY = 'futureswim-demo-portal-key';
