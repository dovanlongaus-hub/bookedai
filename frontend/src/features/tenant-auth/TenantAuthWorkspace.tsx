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
  'Save AI-imported website data into the tenant catalog',
  'Publish or archive services for public search readiness',
  'Keep booking and catalog review inside one authenticated workspace',
];

const tenantAuthAccessStates = [
  {
    label: 'Preview mode',
    description: 'Overview, bookings, and catalog read models stay visible before sign-in.',
  },
  {
    label: 'Write access',
    description: 'Catalog import, edits, and publish actions unlock only after tenant auth succeeds.',
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
  const roleLabel = formatRoleLabel(session?.membership?.role ?? inviteContext?.role);
  const roleNote = session?.membership?.role === 'tenant_admin'
    ? 'This role can manage team access, billing, catalog publishing, and overall tenant setup.'
    : session?.membership?.role === 'finance_manager'
      ? 'This role can manage billing posture and review revenue operations without full tenant administration.'
      : session?.membership?.role === 'operator'
        ? 'This role is geared toward day-to-day catalog, booking, and operations work inside the tenant portal.'
        : null;

  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Auth workspace
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {isGateway ? 'Tenant login and account gateway' : 'Tenant access and publishing control'}
          </h2>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {isGateway
          ? 'Use one shared login portal to sign in to an existing tenant workspace or create a brand-new tenant account, then continue into the correct workspace automatically.'
          : 'Preview stays open for this tenant workspace, while sign-in upgrades the same surface into a write-enabled operator session for catalog import, edits, and publish decisions.'}
      </p>

      <div className="mt-5 grid gap-3">
        {tenantAuthAccessStates.map((item) => (
          <div
            key={item.label}
            className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-4"
          >
            <div className="text-sm font-semibold text-slate-950">{item.label}</div>
            <div className="mt-1 text-sm leading-6 text-slate-600">{item.description}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-sky-200 bg-[linear-gradient(180deg,#f7fbff_0%,#eef6ff_100%)] px-4 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
          {isGateway ? 'Gateway scope' : 'Tenant scope'}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-700">
            {tenantName}
          </span>
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-700">
            {tenantSlug}
          </span>
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-700">
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
          <div className="mt-5 flex flex-wrap gap-2">
            {(
              tenantRef
                ? [
                    { key: 'sign-in' as TenantAuthMode, label: 'Sign in' },
                    { key: 'claim' as TenantAuthMode, label: 'Accept invite' },
                  ]
                : [
                    { key: 'sign-in' as TenantAuthMode, label: 'Sign in' },
                    { key: 'create' as TenantAuthMode, label: 'Create account' },
                  ]
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setAuthMode(item.key)}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                  authMode === item.key
                    ? 'bg-slate-950 text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {authMode === 'sign-in'
                ? 'Password sign-in'
                : authMode === 'create'
                  ? 'Create tenant account'
                  : 'Accept invite or claim workspace'}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              {authMode === 'sign-in'
                ? isGateway
                  ? 'Use your tenant username and password. After authentication, BookedAI will route you into the correct tenant workspace.'
                  : 'Use a tenant-issued username and password to unlock write access for this exact tenant workspace.'
                : authMode === 'create'
                  ? 'Create one tenant account and one workspace that will become the canonical entry for onboarding, operations, and billing.'
                  : 'Accept a pending team invite or claim this tenant workspace with your operator email, then set your first tenant password.'}
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
            <form className="mt-5 space-y-4" onSubmit={onPasswordSignIn}>
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
          ) : null}

          {authMode === 'create' ? (
            <form className="mt-5 space-y-4" onSubmit={onCreateAccount}>
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

          <div className="mt-5 space-y-3">
            {tenantAuthBenefits.map((item) => (
              <div key={item} className="booked-note-panel">
                {item}
              </div>
            ))}
          </div>

          {googleEnabled ? (
            <>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Or continue with Google
                </div>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {googleButtonSlot}
                <button
                  type="button"
                  onClick={onPromptGoogle}
                  className="booked-button-secondary inline-flex items-center gap-2"
                >
                  Use another Google account
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
