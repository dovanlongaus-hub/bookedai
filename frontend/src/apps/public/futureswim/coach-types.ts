export type FutureSwimCoachSummary = {
  id: string;
  email: string;
  full_name: string | null;
  coach_initials: string | null;
  assigned_centre_codes: string[];
};

export type FutureSwimCoachStudentSummary = {
  id: string;
  parent_id: string | null;
  parent_email: string | null;
  parent_full_name: string | null;
  full_name: string;
  date_of_birth: string | null;
  centre_code: string | null;
  current_level_code: string | null;
  enrolled_since: string | null;
  notes_for_coach: string | null;
  last_session_date: string | null;
};

export type FutureSwimCoachMePayload = {
  coach: FutureSwimCoachSummary;
  students: FutureSwimCoachStudentSummary[];
};

export type FutureSwimCoachLoginVerifyPayload = {
  session_token: string;
  expires_in_seconds: number;
  coach: FutureSwimCoachSummary;
};

export type FutureSwimCoachProgressEntry = {
  id: string;
  student_id: string;
  session_date: string | null;
  centre_code: string | null;
  level_code: string | null;
  attendance: number | null;
  focus_skill: string | null;
  notes_md: string | null;
  coach_initials: string | null;
  created_at: string | null;
};

export type FutureSwimCoachEvaluationEntry = {
  id: string;
  student_id: string;
  evaluated_at: string | null;
  level_code: string | null;
  level_outcome: string | null;
  strengths_md: string | null;
  areas_to_work_on_md: string | null;
  next_step_level_code: string | null;
  next_step_summary: string | null;
  coach_initials: string | null;
  created_at: string | null;
};

export type FutureSwimCoachApiResponse<T> =
  | { status: 'ok'; data: T; meta?: unknown }
  | {
      status: 'error';
      data?: never;
      message?: string;
      error?: { code?: string; message?: string; details?: unknown };
      meta?: unknown;
    };
