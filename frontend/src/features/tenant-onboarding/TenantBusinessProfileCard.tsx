import type { Dispatch, FormEventHandler, SetStateAction } from 'react';

type TenantBusinessProfileFormState = {
  business_name: string;
  industry: string;
  timezone: string;
  locale: string;
  operator_full_name: string;
};

export function TenantBusinessProfileCard({
  profileForm,
  setProfileForm,
  profilePending,
  profileError,
  profileMessage,
  onSubmit,
}: {
  profileForm: TenantBusinessProfileFormState;
  setProfileForm: Dispatch<SetStateAction<TenantBusinessProfileFormState>>;
  profilePending: boolean;
  profileError: string | null;
  profileMessage: string | null;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Business profile
      </div>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        Workspace basics
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Save the core business profile that powers tenant identity, onboarding posture, and later
        billing and reporting views.
      </p>

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Business name
            </div>
            <input
              value={profileForm.business_name}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, business_name: event.target.value }))
              }
              className="booked-form-input"
            />
          </label>
          <label className="block">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Operator name
            </div>
            <input
              value={profileForm.operator_full_name}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, operator_full_name: event.target.value }))
              }
              className="booked-form-input"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Industry
            </div>
            <input
              value={profileForm.industry}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, industry: event.target.value }))
              }
              className="booked-form-input"
            />
          </label>
          <label className="block">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Timezone
            </div>
            <input
              value={profileForm.timezone}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, timezone: event.target.value }))
              }
              className="booked-form-input"
            />
          </label>
        </div>

        <label className="block">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Locale
          </div>
          <input
            value={profileForm.locale}
            onChange={(event) =>
              setProfileForm((current) => ({ ...current, locale: event.target.value }))
            }
            className="booked-form-input"
          />
        </label>

        {profileError ? (
          <div className="booked-alert-error">
            {profileError}
          </div>
        ) : null}
        {profileMessage ? (
          <div className="booked-alert-success">
            {profileMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={profilePending || !profileForm.business_name.trim()}
          className={`booked-button ${
            profilePending || !profileForm.business_name.trim()
              ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none'
              : ''
          }`}
        >
          {profilePending ? 'Saving profile...' : 'Save business profile'}
        </button>
      </form>
    </article>
  );
}

export type { TenantBusinessProfileFormState };
