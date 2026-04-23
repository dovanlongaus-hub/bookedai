import type { Dispatch, FormEventHandler, ReactNode, SetStateAction } from 'react';

import type { TenantAuthSessionResponse, TenantOnboardingResponse } from '../../shared/contracts';

export type TenantAuthMode = 'sign-in' | 'create' | 'claim';

export type TenantCreateAccountFormState = {
  business_name: string;
  full_name: string;
  email: string;
  industry: string;
};

export type TenantClaimAccountFormState = {
  full_name: string;
  email: string;
};

export type TenantEmailCodeDeliveryState = {
  email: string;
  auth_intent: 'sign-in' | 'create' | 'claim';
  tenant_slug?: string | null;
  tenant_name?: string | null;
  code_last4?: string | null;
  expires_in_minutes?: number | null;
  operator_note?: string | null;
};

type TenantInviteContext = {
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
};

const tenantAuthBenefits = [
  'Sign in once and keep onboarding, catalog, billing, and team access in one workspace.',
  'Use email code when you want a lightweight login without remembering a tenant password.',
  'Use Google when you want the fastest sign-in or a simple first-time workspace creation path.',
];

function formatRoleLabel(role: string | null | undefined) {
  if (!role) {
    return 'Tenant user';
  }
  return role.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function modeTitle(authMode: TenantAuthMode) {
  if (authMode === 'create') {
    return 'Create tenant account';
  }
  if (authMode === 'claim') {
    return 'Accept invite';
  }
  return 'Sign in with email';
}

function modeDescription(authMode: TenantAuthMode, isGateway: boolean) {
  if (authMode === 'create') {
    return 'Use email as the primary identity. BookedAI sends a verification code, then opens your new workspace.';
  }
  if (authMode === 'claim') {
    return 'Use the invited email to receive a code and activate tenant access safely.';
  }
  return isGateway
    ? 'Enter your tenant email and BookedAI sends a one-time code. Google sign-in stays available on the same form.'
    : 'Enter the tenant email linked to this workspace and BookedAI sends a one-time code to unlock write access.';
}

export function TenantAuthWorkspaceEmail({
  tenantName,
  tenantSlug,
  tenantRef,
  session,
  onboarding,
  authMode,
  setAuthMode,
  authPending,
  authError,
  importMessage,
  emailSignInValue,
  setEmailSignInValue,
  emailCodeValue,
  setEmailCodeValue,
  emailCodeDelivery,
  createAccountForm,
  setCreateAccountForm,
  claimAccountForm,
  setClaimAccountForm,
  googleEnabled,
  googleReady,
  googleButtonSlot,
  onPromptGoogle,
  onRequestEmailCode,
  onVerifyEmailCode,
  tenantChoices,
  onSelectTenantChoice,
  onSignOut,
  inviteContext,
}: {
  tenantName: string;
  tenantSlug: string;
  tenantRef: string | null;
  session: TenantAuthSessionResponse | null;
  onboarding: TenantOnboardingResponse;
  authMode: TenantAuthMode;
  setAuthMode: Dispatch<SetStateAction<TenantAuthMode>>;
  authPending: boolean;
  authError: string | null;
  importMessage: string | null;
  emailSignInValue: string;
  setEmailSignInValue: Dispatch<SetStateAction<string>>;
  emailCodeValue: string;
  setEmailCodeValue: Dispatch<SetStateAction<string>>;
  emailCodeDelivery: TenantEmailCodeDeliveryState | null;
  createAccountForm: TenantCreateAccountFormState;
  setCreateAccountForm: Dispatch<SetStateAction<TenantCreateAccountFormState>>;
  claimAccountForm: TenantClaimAccountFormState;
  setClaimAccountForm: Dispatch<SetStateAction<TenantClaimAccountFormState>>;
  googleEnabled: boolean;
  googleReady: boolean;
  googleButtonSlot?: ReactNode;
  onPromptGoogle: () => void;
  onRequestEmailCode: FormEventHandler<HTMLFormElement>;
  onVerifyEmailCode: FormEventHandler<HTMLFormElement>;
  tenantChoices: Array<{ slug: string; label: string }>;
  onSelectTenantChoice: (tenantSlugValue: string) => void;
  onSignOut: () => void;
  inviteContext?: TenantInviteContext | null;
}) {
  const isGateway = !tenantRef;
  const codeMatchesMode = emailCodeDelivery?.auth_intent === authMode;
  const roleLabel = formatRoleLabel(session?.membership?.role ?? inviteContext?.role);
  const googleTitle =
    authMode === 'create'
      ? 'Create with Google'
      : authMode === 'claim'
        ? 'Accept invite with Google'
        : 'Continue with Google';

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Auth workspace
          </div>
          {isGateway ? (
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              One login portal for every tenant workspace
            </h1>
          ) : null}
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {isGateway ? 'Tenant login and account gateway' : 'Tenant access and publishing'}
          </h2>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {isGateway
          ? 'One login portal for every tenant workspace. Use email code or Google, then continue into the right tenant.'
          : 'Preview stays available here, while verified sign-in upgrades this workspace into a write-enabled operator session.'}
      </p>

      <div className="mt-5 rounded-[1.35rem] border border-sky-200 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_30%),linear-gradient(180deg,#f8fcff_0%,#eef6ff_100%)] px-4 py-4 shadow-[0_14px_34px_rgba(59,130,246,0.10)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
          {isGateway ? 'Gateway scope' : 'Tenant scope'}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700">
            {tenantName}
          </span>
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700">
            {tenantSlug}
          </span>
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700">
            {session ? 'Authenticated write session' : 'Preview only'}
          </span>
        </div>
      </div>

      {session ? (
        <>
          <div className="mt-5 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-900">
                  Connected as {session.user.full_name || session.user.email}
                </div>
                <div className="mt-1 text-xs text-emerald-800">
                  Membership {roleLabel} on {session.membership?.tenant_slug || session.tenant.slug}
                </div>
                <div className="mt-1 text-xs text-emerald-800">
                  Session expires {new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.expires_at))}
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-950">Onboarding progress</div>
              <div className="text-xs font-medium text-slate-600">{onboarding.progress.percent}%</div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-slate-950" style={{ width: `${onboarding.progress.percent}%` }} />
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-600">{onboarding.recommended_next_action}</div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2 rounded-[1.2rem] border border-slate-200/80 bg-white/80 p-2 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
            {(tenantRef
              ? [
                  { key: 'sign-in' as TenantAuthMode, label: 'Sign in' },
                  { key: 'claim' as TenantAuthMode, label: 'Accept invite' },
                ]
              : [
                  { key: 'sign-in' as TenantAuthMode, label: 'Sign in' },
                  { key: 'create' as TenantAuthMode, label: 'Create account' },
                ]).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setAuthMode(item.key)}
                className={`rounded-full px-4 py-2.5 text-xs font-semibold transition ${
                  authMode === item.key
                    ? 'bg-slate-950 text-white shadow-[0_12px_26px_rgba(15,23,42,0.18)]'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-white/85 px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {modeTitle(authMode)}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              {modeDescription(authMode, isGateway)}
            </div>
          </div>

          {authMode === 'claim' && inviteContext?.email ? (
            <div className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                Invite detected
              </div>
              <div className="mt-2 text-sm font-semibold text-amber-950">
                Finish first login as {roleLabel}
              </div>
              <div className="mt-2 text-sm leading-6 text-amber-900">
                This invite was prepared for {inviteContext.full_name || inviteContext.email}. Use the same email to receive a verification code and activate the workspace.
              </div>
            </div>
          ) : null}

          <div className="mt-5 space-y-5">
            <div className="relative overflow-hidden rounded-[1.4rem] border border-sky-200 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_26%),linear-gradient(135deg,rgba(255,255,255,1)_0%,rgba(239,246,255,1)_58%,rgba(224,242,254,0.9)_100%)] px-5 py-5 shadow-[0_18px_40px_rgba(14,116,144,0.12)]">
              <div className="absolute right-4 top-4 rounded-full border border-sky-200/80 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                Google
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                Recommended
              </div>
              <div className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                {googleTitle}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-700">
                Google sign-in stays on the same tenant form so operators can sign in quickly or create a new tenant workspace without switching flows.
              </div>
              {googleEnabled ? (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="min-w-[280px] rounded-[1rem] bg-white/80 p-1 shadow-[0_10px_24px_rgba(14,116,144,0.10)]">
                      {googleButtonSlot}
                    </div>
                    <button
                      type="button"
                      onClick={onPromptGoogle}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50"
                    >
                      Use another Google account
                    </button>
                  </div>
                  {!googleReady ? (
                    <div className="mt-3 text-xs text-slate-500">Loading Google Identity Services...</div>
                  ) : null}
                </>
              ) : (
                <div className="booked-alert-warning mt-4">
                  Add `VITE_GOOGLE_CLIENT_ID` in the frontend environment and `GOOGLE_OAUTH_CLIENT_ID` in the backend to enable tenant Google login.
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-slate-200" />
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Or continue with email code
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-300 to-slate-200" />
            </div>

            {authMode === 'sign-in' ? (
              <form className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] space-y-4" onSubmit={onRequestEmailCode}>
                <label className="block">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Email
                  </div>
                  <input
                    value={emailSignInValue}
                    onChange={(event) => setEmailSignInValue(event.target.value)}
                    placeholder="owner@example.com"
                    className="booked-form-input"
                    autoComplete="email"
                  />
                </label>
                <button
                  type="submit"
                  disabled={authPending || !emailSignInValue.trim()}
                  className={`booked-button ${authPending || !emailSignInValue.trim() ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none' : ''}`}
                >
                  Send login code
                </button>
              </form>
            ) : null}

            {authMode === 'create' ? (
              <form className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] space-y-4" onSubmit={onRequestEmailCode}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Business name
                    </div>
                    <input
                      value={createAccountForm.business_name}
                      onChange={(event) => setCreateAccountForm((current) => ({ ...current, business_name: event.target.value }))}
                      placeholder="Future Swim"
                      className="booked-form-input"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Full name
                    </div>
                    <input
                      value={createAccountForm.full_name}
                      onChange={(event) => setCreateAccountForm((current) => ({ ...current, full_name: event.target.value }))}
                      placeholder="Tenant owner"
                      className="booked-form-input"
                      autoComplete="name"
                    />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Email
                    </div>
                    <input
                      value={createAccountForm.email}
                      onChange={(event) => setCreateAccountForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="owner@example.com"
                      className="booked-form-input"
                      autoComplete="email"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Industry
                    </div>
                    <input
                      value={createAccountForm.industry}
                      onChange={(event) => setCreateAccountForm((current) => ({ ...current, industry: event.target.value }))}
                      placeholder="Swim school, salon, clinic..."
                      className="booked-form-input"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={authPending || !createAccountForm.business_name.trim() || !createAccountForm.email.trim()}
                  className={`booked-button ${authPending || !createAccountForm.business_name.trim() || !createAccountForm.email.trim() ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none' : ''}`}
                >
                  Email me a setup code
                </button>
              </form>
            ) : null}

            {authMode === 'claim' ? (
              <form className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] space-y-4" onSubmit={onRequestEmailCode}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Full name
                    </div>
                    <input
                      value={claimAccountForm.full_name}
                      onChange={(event) => setClaimAccountForm((current) => ({ ...current, full_name: event.target.value }))}
                      placeholder="Workspace owner"
                      className="booked-form-input"
                      autoComplete="name"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Email
                    </div>
                    <input
                      value={claimAccountForm.email}
                      onChange={(event) => setClaimAccountForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="owner@example.com"
                      className="booked-form-input"
                      autoComplete="email"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={authPending || !claimAccountForm.email.trim()}
                  className={`booked-button ${authPending || !claimAccountForm.email.trim() ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none' : ''}`}
                >
                  Send invite code
                </button>
              </form>
            ) : null}

            {codeMatchesMode ? (
              <form className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_10px_24px_rgba(16,185,129,0.08)] space-y-4" onSubmit={onVerifyEmailCode}>
                <div>
                  <div className="text-sm font-semibold text-emerald-950">Enter verification code</div>
                  <div className="mt-1 text-sm leading-6 text-emerald-900">
                    We sent a code to {emailCodeDelivery.email}
                    {emailCodeDelivery.code_last4 ? ` ending in ${emailCodeDelivery.code_last4}` : ''}.
                    {emailCodeDelivery.expires_in_minutes ? ` The code expires in ${emailCodeDelivery.expires_in_minutes} minutes.` : ''}
                  </div>
                </div>
                <label className="block">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    Verification code
                  </div>
                  <input
                    value={emailCodeValue}
                    onChange={(event) => setEmailCodeValue(event.target.value)}
                    placeholder="123456"
                    inputMode="numeric"
                    className="booked-form-input"
                    autoComplete="one-time-code"
                  />
                </label>
                <button
                  type="submit"
                  disabled={authPending || !emailCodeValue.trim()}
                  className={`booked-button ${authPending || !emailCodeValue.trim() ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none' : ''}`}
                >
                  Verify code
                </button>
              </form>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3">
            {tenantAuthBenefits.map((item) => (
              <div key={item} className="rounded-[1rem] border border-slate-200 bg-white/85 px-4 py-3 text-sm leading-6 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                {item}
              </div>
            ))}
          </div>
        </>
      )}

      {authPending ? <div className="mt-4 text-sm text-slate-600">Verifying tenant account...</div> : null}
      {authError ? <div className="booked-alert-error mt-4">{authError}</div> : null}
      {tenantChoices.length ? (
        <div className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
            Choose tenant workspace
          </div>
          <div className="mt-2 text-sm leading-6 text-amber-900">
            This identity is linked to more than one tenant workspace. Open the exact workspace first, then finish sign-in there.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {tenantChoices.map((choice) => (
              <button
                key={choice.slug}
                type="button"
                onClick={() => onSelectTenantChoice(choice.slug)}
                className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {importMessage ? <div className="booked-alert-success mt-4">{importMessage}</div> : null}
    </article>
  );
}
