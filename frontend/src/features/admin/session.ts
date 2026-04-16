const ADMIN_SESSION_TOKEN_KEY = 'bookedai_admin_session';
const ADMIN_SESSION_USERNAME_KEY = 'bookedai_admin_username';
const ADMIN_SESSION_EXPIRY_KEY = 'bookedai_admin_expires_at';
const ADMIN_SHADOW_REVIEW_CATEGORY_KEY = 'bookedai_admin_shadow_review_category';
const ADMIN_SHADOW_REVIEWED_CASES_KEY = 'bookedai_admin_shadow_reviewed_cases';
const ADMIN_SHADOW_REVIEW_SORT_MODE_KEY = 'bookedai_admin_shadow_review_sort_mode';
const ADMIN_SHADOW_REVIEW_AUTO_ADVANCE_KEY = 'bookedai_admin_shadow_review_auto_advance';
const ADMIN_SHADOW_REVIEW_CASE_NOTES_KEY = 'bookedai_admin_shadow_review_case_notes';

export const ADMIN_SESSION_EXPIRED_MESSAGE = 'Your admin session expired. Sign in again to continue.';

export type StoredAdminSession = {
  token: string;
  username: string;
  expiresAt: string;
};

export function loadStoredAdminSession(): StoredAdminSession {
  return {
    token: window.localStorage.getItem(ADMIN_SESSION_TOKEN_KEY) ?? '',
    username: window.localStorage.getItem(ADMIN_SESSION_USERNAME_KEY) ?? '',
    expiresAt: window.localStorage.getItem(ADMIN_SESSION_EXPIRY_KEY) ?? '',
  };
}

export function persistAdminSession(session: StoredAdminSession) {
  window.localStorage.setItem(ADMIN_SESSION_TOKEN_KEY, session.token);
  window.localStorage.setItem(ADMIN_SESSION_USERNAME_KEY, session.username);
  window.localStorage.setItem(ADMIN_SESSION_EXPIRY_KEY, session.expiresAt);
}

export function clearStoredAdminSession() {
  window.localStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_SESSION_USERNAME_KEY);
  window.localStorage.removeItem(ADMIN_SESSION_EXPIRY_KEY);
}

export function isStoredAdminSessionExpired(expiresAt: string) {
  if (!expiresAt) {
    return false;
  }

  const expiryTime = Date.parse(expiresAt);
  if (Number.isNaN(expiryTime)) {
    return false;
  }

  return expiryTime <= Date.now();
}

export type StoredShadowReviewState = {
  selectedCategory: string;
  reviewedCaseKeys: string[];
  sortMode: string;
  autoAdvance: boolean;
  caseNotes: Record<string, string>;
};

export function loadStoredShadowReviewState(): StoredShadowReviewState {
  let reviewedCaseKeys: string[] = [];
  let caseNotes: Record<string, string> = {};
  try {
    const raw = window.localStorage.getItem(ADMIN_SHADOW_REVIEWED_CASES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      reviewedCaseKeys = parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    reviewedCaseKeys = [];
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_SHADOW_REVIEW_CASE_NOTES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      caseNotes = Object.fromEntries(
        Object.entries(parsed).filter(
          ([key, value]) => typeof key === 'string' && typeof value === 'string',
        ),
      ) as Record<string, string>;
    }
  } catch {
    caseNotes = {};
  }

  return {
    selectedCategory: window.localStorage.getItem(ADMIN_SHADOW_REVIEW_CATEGORY_KEY) ?? 'all',
    reviewedCaseKeys,
    sortMode: window.localStorage.getItem(ADMIN_SHADOW_REVIEW_SORT_MODE_KEY) ?? 'pending_first',
    autoAdvance: window.localStorage.getItem(ADMIN_SHADOW_REVIEW_AUTO_ADVANCE_KEY) === 'true',
    caseNotes,
  };
}

export function persistShadowReviewState(state: StoredShadowReviewState) {
  window.localStorage.setItem(ADMIN_SHADOW_REVIEW_CATEGORY_KEY, state.selectedCategory);
  window.localStorage.setItem(
    ADMIN_SHADOW_REVIEWED_CASES_KEY,
    JSON.stringify(state.reviewedCaseKeys),
  );
  window.localStorage.setItem(ADMIN_SHADOW_REVIEW_SORT_MODE_KEY, state.sortMode);
  window.localStorage.setItem(
    ADMIN_SHADOW_REVIEW_AUTO_ADVANCE_KEY,
    state.autoAdvance ? 'true' : 'false',
  );
  window.localStorage.setItem(ADMIN_SHADOW_REVIEW_CASE_NOTES_KEY, JSON.stringify(state.caseNotes));
}

export function clearStoredShadowReviewState() {
  window.localStorage.removeItem(ADMIN_SHADOW_REVIEW_CATEGORY_KEY);
  window.localStorage.removeItem(ADMIN_SHADOW_REVIEWED_CASES_KEY);
  window.localStorage.removeItem(ADMIN_SHADOW_REVIEW_SORT_MODE_KEY);
  window.localStorage.removeItem(ADMIN_SHADOW_REVIEW_AUTO_ADVANCE_KEY);
  window.localStorage.removeItem(ADMIN_SHADOW_REVIEW_CASE_NOTES_KEY);
}
