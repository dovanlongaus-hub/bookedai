import type { Dispatch, FormEventHandler, ReactNode, SetStateAction } from 'react';

import type { TenantAuthSessionResponse, TenantOnboardingResponse } from '../../shared/contracts';

export type TenantAuthMode = 'sign-in' | 'create' | 'claim';

export type TenantCreateAccountFormState = {
  business_name: string;
  full_name: string;
  email: string;
  username: string;
  password: string;
  industry: string;
};

export type TenantClaimAccountFormState = {
  full_name: string;
  email: string;
  username: string;
  password: string;
};

type TenantInviteContext = {
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
};

const tenantAuthBenefits = [
  'Save AI-imported business data into your tenant catalog',
  'Publish or archive services when they are ready for search',
  'Manage bookings, catalog review, and workspace setup in one place',
];

const tenantAuthAccessStates = [
  {
    label: 'Preview mode',
    description: 'Overview, bookings, and catalog visibility stay available before sign-in.',
  },
  {
    label: 'Write access',
    description: 'Import, edits, billing updates, and publish actions unlock after sign-in.',
  },
];

function formatRoleLabel(role: string | null | undefined) {
  if (!role) {
    return 'Tenant user';
  }
  return role.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function TenantAuthWorkspace({
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
  passwordUsername,
  setPasswordUsername,
  passwordValue,
  setPasswordValue,
  createAccountForm,
  setCreateAccountForm,
  claimAccountForm,
  setClaimAccountForm,
  googleEnabled,
  googleReady,
  googleButtonSlot,
  onPromptGoogle,
  onPasswordSignIn,
  onCreateAccount,
  onClaimAccount,
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
  passwordUsername: string;
  setPasswordUsername: Dispatch<SetStateAction<string>>;
  passwordValue: string;
  setPasswordValue: Dispatch<SetStateAction<string>>;
  createAccountForm: TenantCreateAccountFormState;
  setCreateAccountForm: Dispatch<SetStateAction<TenantCreateAccountFormState>>;
  claimAccountForm: TenantClaimAccountFormState;
  setClaimAccountForm: Dispatch<SetStateAction<TenantClaimAccountFormState>>;
  googleEnabled: boolean;
  googleReady: boolean;
  googleButtonSlot?: ReactNode;
  onPromptGoogle: () => void;
  onPasswordSignIn: FormEventHandler<HTMLFormElement>;
  onCreateAccount: FormEventHandler<HTMLFormElement>;
  onClaimAccount: FormEventHandler<HTMLFormElement>;
  tenantChoices: Array<{ slug: string; label: string }>;
  onSelectTenantChoice: (tenantSlug: string) => void;
  onSignOut: () => void;
  inviteContext?: TenantInviteContext | null;
}) {
  const isGateway = !tenantRef;
  const googleActionLabel =
    authMode === 'create'
      ? 'Continue with Google'
      : authMode === 'claim'
        ? 'Accept your invite with Google'
        : 'Continue with Google';
  const googleHelperCopy =
    authMode === 'create'
      ? 'Google can create the owner account automatically. Add the business name if you want to guide the new workspace details.'
      : authMode === 'claim'
        ? 'Use the invited Google account to confirm ownership and activate this workspace.'
        : 'Use Google to sign in quickly, or let BookedAI create your workspace automatically if this is your first time here.';
  const showGoogleCreatePrimary = authMode === 'create' && googleEnabled;
  const showGoogleSignInPrimary = authMode === 'sign-in' && googleEnabled;
  const showGooglePrimary = showGoogleCreatePrimary || showGoogleSignInPrimary;
  const roleLabel = formatRoleLabel(session?.membership?.role ?? inviteContext?.role);
  const roleNote = session?.membership?.role === 'tenant_admin'
    ? 'This role can manage team access, billing, catalog publishing, and overall tenant setup.'
    : session?.membership?.role === 'finance_manager'
      ? 'This role can manage billing posture and review revenue operations without full tenant administration.'
      : session?.membership?.role === 'operator'
        ? 'This role is geared toward day-to-day catalog, booking, and operations work inside the tenant portal.'
        : null;

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Auth workspace
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {isGateway ? 'Tenant sign in and account access' : 'Tenant access and publishing'}
          </h2>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {isGateway
          ? 'Use one shared tenant portal to sign in, create a new workspace, and continue into the right tenant automatically.'
          : 'Preview stays open here, while sign-in upgrades this workspace into a write-enabled operator session.'}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {tenantAuthAccessStates.map((item) => (
          <div
            key={item.label}
            className="rounded-[1.2rem] border border-slate-200 bg-white/80 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] backdrop-blur"
          >
            <div className="text-sm font-semibold text-slate-950">{item.label}</div>
            <div className="mt-1 text-sm leading-6 text-slate-600">{item.description}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[1.35rem] border border-sky-200 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_30%),linear-gradient(180deg,#f8fcff_0%,#eef6ff_100%)] px-4 py-4 shadow-[0_14px_34px_rgba(59,130,246,0.10)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
          {isGateway ? 'Gateway scope' : 'Tenant scope'}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 shadow-[0_6px_16px_rgba(59,130,246,0.08)]">
            {tenantName}
          </span>
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 shadow-[0_6px_16px_rgba(59,130,246,0.08)]">
            {tenantSlug}
          </span>
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 shadow-[0_6px_16px_rgba(59,130,246,0.08)]">
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
                  Session expires {new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.expires_at))}
                </div>
                {session.membership ? (
                  <div className="mt-1 text-xs text-emerald-800">
                    Membership {session.membership.role} on {session.membership.tenant_slug}
                  </div>
                ) : null}
                {roleNote ? (
                  <div className="mt-2 rounded-[0.95rem] border border-emerald-200 bg-white/70 px-3 py-2 text-xs text-emerald-900">
                    {roleNote}
                  </div>
                ) : null}
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

          <div className="mt-5 space-y-3">
            {tenantAuthBenefits.map((item) => (
              <div
                key={item}
                className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-950">Onboarding progress</div>
              <div className="text-xs font-medium text-slate-600">{onboarding.progress.percent}%</div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-slate-950"
                style={{ width: `${onboarding.progress.percent}%` }}
              />
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-600">
              {onboarding.recommended_next_action}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2 rounded-[1.2rem] border border-slate-200/80 bg-white/80 p-2 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
            {(
              tenantRef
                ? [
                    { key: 'sign-in' as TenantAuthMode, label: 'Sign in' },
                    { key: 'claim' as TenantAuthMode, label: 'Accept invite' },
                  ]
                : [
                    { key: 'sign-in' as TenantAuthMode, label: 'Sign in' },
                    { key: 'create' as TenantAuthMode, label: 'New workspace' },
                  ]
            ).map((item) => (
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
              {authMode === 'sign-in'
                ? 'Password sign-in'
                : authMode === 'create'
                  ? 'Create tenant account'
                  : 'Accept invite'}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              {authMode === 'sign-in'
                ? isGateway
                  ? 'Use your tenant username and password if you prefer not to use Google sign-in.'
                  : 'Use your tenant username and password to unlock write access for this workspace.'
                : authMode === 'create'
                  ? 'Create one owner account and one workspace for onboarding, operations, and billing.'
                  : 'Accept a pending invite with your operator email, then finish setting up access for this workspace.'}
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
                This invite was prepared for {inviteContext.full_name || inviteContext.email}. Use the
                same email and create your tenant username/password to activate the workspace access.
              </div>
            </div>
          ) : null}

          {authMode === 'sign-in' ? (
            <div className="mt-5 space-y-5">
              {showGoogleSignInPrimary ? (
                <div className="relative overflow-hidden rounded-[1.4rem] border border-sky-200 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_26%),linear-gradient(135deg,rgba(255,255,255,1)_0%,rgba(239,246,255,1)_58%,rgba(224,242,254,0.9)_100%)] px-5 py-5 shadow-[0_18px_40px_rgba(14,116,144,0.12)]">
                  <div className="absolute right-4 top-4 rounded-full border border-sky-200/80 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 backdrop-blur">
                    Google-first
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                    Recommended
                  </div>
                  <div className="mt-2 max-w-[20rem] text-xl font-semibold tracking-tight text-slate-950">
                    Sign in with Google
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-700">
                    Use the Google account linked to your tenant workspace for the fastest way back in.
                    Username and password stay available below if you need them.
                  </div>
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
                    <div className="mt-3 text-xs text-slate-500">
                      Loading Google Identity Services...
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showGoogleSignInPrimary ? (
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-slate-200" />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Or sign in with password
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-300 to-slate-200" />
                </div>
              ) : null}

              <form className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] space-y-4" onSubmit={onPasswordSignIn}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Username
                    </div>
                    <input
                      value={passwordUsername}
                      onChange={(event) => setPasswordUsername(event.target.value)}
                      placeholder="Tenant username"
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
                      value={passwordValue}
                      onChange={(event) => setPasswordValue(event.target.value)}
                      placeholder="Enter tenant password"
                      className="booked-form-input"
                      autoComplete="current-password"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={authPending || !passwordUsername.trim() || !passwordValue.trim()}
                  className={`booked-button ${
                    authPending || !passwordUsername.trim() || !passwordValue.trim()
                      ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none'
                      : ''
                  }`}
                >
                  {isGateway ? 'Sign in to tenant workspace' : 'Sign in to unlock tenant edits'}
                </button>
              </form>
            </div>
          ) : null}

          {authMode === 'create' ? (
            <div className="mt-5 space-y-5">
              {showGoogleCreatePrimary ? (
                <div className="relative overflow-hidden rounded-[1.4rem] border border-sky-200 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_26%),linear-gradient(135deg,rgba(255,255,255,1)_0%,rgba(239,246,255,1)_58%,rgba(224,242,254,0.9)_100%)] px-5 py-5 shadow-[0_18px_40px_rgba(14,116,144,0.12)]">
                  <div className="absolute right-4 top-4 rounded-full border border-sky-200/80 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 backdrop-blur">
                    Google-first
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                    Recommended
                  </div>
                  <div className="mt-2 max-w-[20rem] text-xl font-semibold tracking-tight text-slate-950">
                    Create your tenant with Google
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-700">
                    Continue with Google and BookedAI can create the owner account automatically
                    on first access. Add the business name first if you want to guide the initial
                    workspace details.
                  </div>
                  {!createAccountForm.business_name.trim() ? (
                    <div className="mt-3 rounded-[1rem] border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
                      Business name is now optional here. If you leave it blank, BookedAI will seed
                      the first workspace name from your Google profile.
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="min-w-[280px] rounded-[1rem] bg-white/80 p-1 shadow-[0_10px_24px_rgba(14,116,144,0.10)]">
                      {googleButtonSlot}
                    </div>
                    <button
                      type="button"
                      onClick={onPromptGoogle}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50"
                    >
                      Create with another Google account
                    </button>
                  </div>
                  {!googleReady ? (
                    <div className="mt-3 text-xs text-slate-500">
                      Loading Google Identity Services...
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showGoogleCreatePrimary ? (
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-slate-200" />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Or create with password
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-300 to-slate-200" />
                </div>
              ) : null}

              <form className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] space-y-4" onSubmit={onCreateAccount}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Business name
                  </div>
                  <input
                    value={createAccountForm.business_name}
                    onChange={(event) =>
                      setCreateAccountForm((current) => ({ ...current, business_name: event.target.value }))
                    }
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
                    onChange={(event) =>
                      setCreateAccountForm((current) => ({ ...current, full_name: event.target.value }))
                    }
                    placeholder="Tenant owner"
                    className="booked-form-input"
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
                    onChange={(event) =>
                      setCreateAccountForm((current) => ({ ...current, email: event.target.value }))
                    }
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
                    onChange={(event) =>
                      setCreateAccountForm((current) => ({ ...current, industry: event.target.value }))
                    }
                    placeholder="Swim school, salon, clinic..."
                    className="booked-form-input"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Username
                  </div>
                  <input
                    value={createAccountForm.username}
                    onChange={(event) =>
                      setCreateAccountForm((current) => ({ ...current, username: event.target.value }))
                    }
                    placeholder="tenant-admin"
                    className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                    autoComplete="username"
                  />
                </label>
                <label className="block">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Password
                  </div>
                  <input
                    type="password"
                    value={createAccountForm.password}
                    onChange={(event) =>
                      setCreateAccountForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Create a password"
                    className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                    autoComplete="new-password"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={
                  authPending
                  || !createAccountForm.business_name.trim()
                  || !createAccountForm.email.trim()
                  || !createAccountForm.username.trim()
                  || !createAccountForm.password.trim()
                }
                className={`booked-button ${
                  authPending
                  || !createAccountForm.business_name.trim()
                  || !createAccountForm.email.trim()
                  || !createAccountForm.username.trim()
                  || !createAccountForm.password.trim()
                    ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none'
                    : ''
                }`}
              >
                Create tenant account
              </button>
              </form>
            </div>
          ) : null}

          {authMode === 'claim' ? (
            <form className="mt-5 space-y-4" onSubmit={onClaimAccount}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Full name
                  </div>
                  <input
                    value={claimAccountForm.full_name}
                    onChange={(event) =>
                      setClaimAccountForm((current) => ({ ...current, full_name: event.target.value }))
                    }
                    placeholder="Workspace owner"
                    className="booked-form-input"
                  />
                </label>
                <label className="block">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Email
                  </div>
                  <input
                    value={claimAccountForm.email}
                    onChange={(event) =>
                      setClaimAccountForm((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="owner@example.com"
                    className="booked-form-input"
                    autoComplete="email"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Username
                  </div>
                  <input
                    value={claimAccountForm.username}
                    onChange={(event) =>
                      setClaimAccountForm((current) => ({ ...current, username: event.target.value }))
                    }
                    placeholder="tenant-owner"
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
                    value={claimAccountForm.password}
                    onChange={(event) =>
                      setClaimAccountForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Create a password"
                    className="booked-form-input"
                    autoComplete="new-password"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={
                  authPending
                  || !claimAccountForm.email.trim()
                  || !claimAccountForm.username.trim()
                  || !claimAccountForm.password.trim()
                }
                className={`booked-button ${
                  authPending
                  || !claimAccountForm.email.trim()
                  || !claimAccountForm.username.trim()
                  || !claimAccountForm.password.trim()
                    ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none'
                    : ''
                }`}
              >
                Accept invite
              </button>
            </form>
          ) : null}

          <div className="mt-6 grid gap-3">
            {tenantAuthBenefits.map((item) => (
              <div key={item} className="rounded-[1rem] border border-slate-200 bg-white/85 px-4 py-3 text-sm leading-6 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                {item}
              </div>
            ))}
          </div>

          {googleEnabled ? (
            <>
              {!showGooglePrimary ? (
                <>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-slate-200" />
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Or continue with Google
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-300 to-slate-200" />
                  </div>
                  <div className="mt-4 rounded-[1.25rem] border border-sky-200 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),linear-gradient(180deg,#f8fcff_0%,#eef6ff_100%)] px-4 py-4 shadow-[0_14px_32px_rgba(14,116,144,0.10)]">
                    <div className="text-sm font-semibold text-sky-950">{googleActionLabel}</div>
                    <div className="mt-1 text-sm leading-6 text-sky-900">
                      {googleHelperCopy}
                    </div>
                  </div>
                </>
              ) : null}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="min-w-[280px] rounded-[1rem] bg-white p-1 shadow-[0_10px_24px_rgba(14,116,144,0.10)]">
                  {googleButtonSlot}
                </div>
                <button
                  type="button"
                  onClick={onPromptGoogle}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  {authMode === 'create' ? 'Create with another Google account' : 'Use another Google account'}
                </button>
              </div>
              {!googleReady ? (
                <div className="mt-3 text-xs text-slate-500">
                  Loading Google Identity Services...
                </div>
              ) : null}
            </>
          ) : (
            <div className="booked-alert-warning mt-5">
              Add `VITE_GOOGLE_CLIENT_ID` in the frontend environment and `GOOGLE_OAUTH_CLIENT_ID`
              in the backend to enable tenant Google login.
            </div>
          )}
        </>
      )}

      {authPending ? (
        <div className="mt-4 text-sm text-slate-600">Verifying tenant account...</div>
      ) : null}
      {authError ? (
        <div className="booked-alert-error mt-4">
          {authError}
        </div>
      ) : null}
      {tenantChoices.length ? (
        <div className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
            Choose tenant workspace
          </div>
          <div className="mt-2 text-sm leading-6 text-amber-900">
            This Google account is linked to more than one tenant workspace. Pick the workspace
            you want to enter now. If you refreshed this page, confirm the Google account again
            before selecting.
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
      {importMessage ? (
        <div className="booked-alert-success mt-4">
          {importMessage}
        </div>
      ) : null}
    </article>
  );
}
