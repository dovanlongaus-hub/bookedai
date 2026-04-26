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
  return 'Access your tenant workspace';
}

function modeDescription(authMode: TenantAuthMode, isGateway: boolean) {
  if (authMode === 'create') {
    return 'Create a workspace for bookings, revenue proof, follow-up, and tenant-owned operations.';
  }
  if (authMode === 'claim') {
    return 'Use the invited email to receive a code and activate tenant access safely.';
  }
  return isGateway
    ? 'Use Google when your account is linked to a tenant. Use email code if you need a secure fallback.'
    : 'Use Google or email code to unlock tenant-owned changes for this workspace.';
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
  passwordSignInEmail,
  setPasswordSignInEmail,
  passwordSignInValue,
  setPasswordSignInValue,
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
  onPasswordSignIn,
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
  passwordSignInEmail: string;
  setPasswordSignInEmail: Dispatch<SetStateAction<string>>;
  passwordSignInValue: string;
  setPasswordSignInValue: Dispatch<SetStateAction<string>>;
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
  onPasswordSignIn: FormEventHandler<HTMLFormElement>;
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
  const googlePrimaryAction =
    authMode === 'create'
      ? 'Create with Google'
      : authMode === 'claim'
        ? 'Accept with Google'
        : 'Continue with Google';
  const emailValue =
    authMode === 'create'
      ? createAccountForm.email
      : authMode === 'claim'
        ? claimAccountForm.email
        : emailSignInValue;
  const emailSubmitDisabled =
    authPending ||
    !emailValue.trim() ||
    (authMode === 'create' && !createAccountForm.business_name.trim());

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tenant access</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {session ? 'Workspace connected' : modeTitle(authMode)}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            {session
              ? 'Your verified session is active for this tenant workspace.'
              : modeDescription(authMode, isGateway)}
          </p>
        </div>
        <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right sm:block">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {isGateway ? 'Gateway' : 'Tenant'}
          </div>
          <div className="mt-1 max-w-[12rem] truncate text-sm font-semibold text-slate-950">{tenantName}</div>
          <div className="mt-0.5 max-w-[12rem] truncate text-xs text-slate-500">{tenantSlug}</div>
        </div>
      </div>

      {session ? (
        <>
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4">
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

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
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
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
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
                className={`rounded-md px-4 py-2.5 text-sm font-semibold transition ${
                  authMode === item.key
                    ? 'bg-slate-950 text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)]'
                    : 'text-slate-600 hover:bg-white hover:text-slate-950'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {authMode === 'claim' && inviteContext?.email ? (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
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

          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">{googleTitle}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {authMode === 'create'
                      ? 'Creates the owner account and opens the new workspace.'
                      : 'Uses the Google account linked to an active tenant membership.'}
                  </div>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-bold text-slate-700">
                  G
                </div>
              </div>
              {googleEnabled ? (
                <>
                  <div className="mt-4 grid gap-3">
                    <button
                      type="button"
                      onClick={onPromptGoogle}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-900 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] transition hover:bg-slate-800"
                    >
                      {googlePrimaryAction}
                    </button>
                    <div className="hidden min-h-[44px] w-full items-center justify-center overflow-hidden rounded-md bg-white p-1 shadow-[0_8px_18px_rgba(15,23,42,0.08)] sm:flex">
                      {googleButtonSlot}
                    </div>
                    <button
                      type="button"
                      onClick={onPromptGoogle}
                      className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
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
              <div className="h-px flex-1 bg-slate-200" />
              <div className="text-xs font-semibold text-slate-400">or email sign-in</div>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {authMode === 'sign-in' ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <form className="space-y-4 rounded-lg border border-slate-200 bg-white p-4" onSubmit={onRequestEmailCode}>
                  <div>
                    <div className="text-sm font-semibold text-slate-950">Email code</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Get a one-time code by email and continue without using a password.
                    </div>
                  </div>
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
                    aria-label="Send login code"
                    disabled={emailSubmitDisabled}
                    className={`booked-button w-full ${emailSubmitDisabled ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none' : ''}`}
                  >
                    <span aria-hidden="true" className="sm:hidden">Send code</span>
                    <span aria-hidden="true" className="hidden sm:inline">Send login code</span>
                  </button>
                </form>

                <form className="space-y-4 rounded-lg border border-slate-200 bg-white p-4" onSubmit={onPasswordSignIn}>
                  <div>
                    <div className="text-sm font-semibold text-slate-950">Email and password</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Sign in directly with the tenant email and password for this workspace.
                    </div>
                  </div>
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Email
                    </div>
                    <input
                      value={passwordSignInEmail}
                      onChange={(event) => setPasswordSignInEmail(event.target.value)}
                      placeholder="owner@example.com"
                      className="booked-form-input"
                      autoComplete="username"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Password
                    </div>
                    <input
                      type="password"
                      value={passwordSignInValue}
                      onChange={(event) => setPasswordSignInValue(event.target.value)}
                      placeholder="Enter tenant password"
                      className="booked-form-input"
                      autoComplete="current-password"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={authPending || !passwordSignInEmail.trim() || !passwordSignInValue.trim()}
                    className={`booked-button w-full ${authPending || !passwordSignInEmail.trim() || !passwordSignInValue.trim() ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none' : ''}`}
                  >
                    Sign in with password
                  </button>
                </form>
              </div>
            ) : null}

            {authMode === 'create' ? (
              <form className="space-y-4 rounded-lg border border-slate-200 bg-white p-4" onSubmit={onRequestEmailCode}>
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
                  disabled={emailSubmitDisabled}
                  className={`booked-button w-full ${emailSubmitDisabled ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none' : ''}`}
                >
                  Email me a setup code
                </button>
              </form>
            ) : null}

            {authMode === 'claim' ? (
              <form className="space-y-4 rounded-lg border border-slate-200 bg-white p-4" onSubmit={onRequestEmailCode}>
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
                  disabled={emailSubmitDisabled}
                  className={`booked-button w-full ${emailSubmitDisabled ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none' : ''}`}
                >
                  Send invite code
                </button>
              </form>
            ) : null}

            {codeMatchesMode ? (
              <form className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4" onSubmit={onVerifyEmailCode}>
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
                  className={`booked-button w-full ${authPending || !emailCodeValue.trim() ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none' : ''}`}
                >
                  Verify code
                </button>
              </form>
            ) : null}
          </div>
        </>
      )}

      {authPending ? <div className="mt-4 text-sm text-slate-600">Verifying tenant account...</div> : null}
      {authError ? <div className="booked-alert-error mt-4">{authError}</div> : null}
      {tenantChoices.length ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
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
