import { FormEvent } from 'react';
import { brandDescriptor, brandName } from '../../components/landing/data';
import { LogoMark } from '../../components/landing/ui/LogoMark';

type AdminLoginScreenProps = {
  username: string;
  password: string;
  loggingIn: boolean;
  error: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AdminLoginScreen({
  username,
  password,
  loggingIn,
  error,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: AdminLoginScreenProps) {
  return (
    <main className="booked-admin-login-shell lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="booked-admin-login-hero p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
              Admin Portal
            </div>
            <div className="mt-5 max-w-[17rem] sm:max-w-[19rem]">
              <LogoMark
                variant="white"
                className="booked-brand-image booked-brand-image--hero booked-brand-image--soft w-full opacity-95"
              />
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">
              {brandName} operations dashboard for revenue flow, bookings, and messaging
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
              Sign in to review live booking references, payment readiness, workflow callbacks,
              inbox state, and integration configuration from one place.
            </p>
            <div className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/80">
              {brandDescriptor}
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                'Live booking feed with customer and service details',
                'Payment and workflow states for each booking reference',
                'Inbox and integration visibility without shell access',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.5rem] border border-white/10 bg-slate-950/20 p-4 text-sm text-slate-100"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="booked-admin-login-card p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
              Sign in
            </div>
            <h2 className="mt-4 text-2xl font-bold">Access admin.bookedai.au</h2>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-slate-700">Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                  className="booked-field"
                  placeholder="info@bookedai.au"
                  autoComplete="username"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-slate-700">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  className="booked-field"
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                />
              </label>
              <button
                type="submit"
                disabled={!username || !password || loggingIn}
                className="booked-button w-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingIn ? 'Signing in...' : 'Sign in to admin'}
              </button>
            </form>
            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
