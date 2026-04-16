import { FormEvent } from 'react';
import { brandDescriptor, brandLogoPath, brandName } from '../../components/landing/data';

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_24%),linear-gradient(180deg,#0f172a_0%,#111827_45%,#e2e8f0_100%)] px-6 py-10 text-white lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/10 p-8 backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
              Admin Portal
            </div>
            <div className="mt-5 flex h-18 w-18 items-center justify-center overflow-hidden rounded-[1.25rem] bg-white/10 p-2">
              <img
                src={brandLogoPath}
                alt={`${brandName} logo`}
                className="h-full w-full object-contain"
                loading="eager"
              />
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">
              {brandName} operations dashboard for bookings, payment flow, and messaging
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

          <section className="rounded-[2rem] border border-white/10 bg-white p-8 text-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
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
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
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
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                />
              </label>
              <button
                type="submit"
                disabled={!username || !password || loggingIn}
                className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
