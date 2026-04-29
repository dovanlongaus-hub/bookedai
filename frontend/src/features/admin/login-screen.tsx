import { FormEvent, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Mail,
  KeyRound,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
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
  const [activeMethod, setActiveMethod] = useState<'google' | 'code' | 'password'>('password');
  const tabClassName = (method: typeof activeMethod) =>
    `min-h-10 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      activeMethod === method
        ? 'bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.10)]'
        : 'text-slate-600 hover:bg-white/70 hover:text-slate-950'
    }`;

  return (
    <main className="min-h-screen overflow-x-clip bg-[#f8fafc] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_16px_50px_rgba(15,23,42,0.07)] md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-950 text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">admin.bookedai.au</div>
              <div className="truncate text-xs text-slate-500">Revenue operations workspace</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            API route secured
          </div>
        </header>

        <div className="grid flex-1 items-center gap-6 py-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,440px)] lg:py-10">
          <section className="order-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-6 lg:order-1">
            <div className="flex items-center gap-3">
              <div className="max-w-[11rem]">
                <LogoMark
                  variant="dark"
                  className="booked-brand-image booked-brand-image--admin w-full"
                />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Enterprise Admin Portal
                </div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Manage bookings, messages, and revenue follow-up.
                </h1>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
              {brandName} gives service teams one clear workspace for live bookings,
              payment posture, customer messages, tenant support, and reliability review.
            </p>
            <div className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {brandDescriptor}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Booking queue', value: 'Live queue', icon: Activity },
                { label: 'Revenue posture', value: 'Payment ready', icon: BadgeCheck },
                { label: 'Platform health', value: 'API-backed', icon: ServerCog },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <div className="mt-3 text-sm font-semibold text-slate-950">{item.value}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">{item.label}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="order-1 rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-[0_20px_70px_rgba(15,23,42,0.10)] sm:p-6 lg:order-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                  <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                  Secure sign in
                </div>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight">Sign in</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Choose one method. Password access is active for the current admin workspace.
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="Admin sign-in method">
              <button type="button" role="tab" aria-selected={activeMethod === 'google'} onClick={() => setActiveMethod('google')} className={tabClassName('google')}>
                Google
              </button>
              <button type="button" role="tab" aria-selected={activeMethod === 'code'} onClick={() => setActiveMethod('code')} className={tabClassName('code')}>
                Email code
              </button>
              <button type="button" role="tab" aria-selected={activeMethod === 'password'} onClick={() => setActiveMethod('password')} className={tabClassName('password')}>
                Password
              </button>
            </div>

            {activeMethod === 'google' ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700">
                    G
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-950">Continue with Google</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Admin Google SSO is prepared as the primary operator path.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500"
                >
                  Google SSO pending
                </button>
              </div>
            ) : null}

            {activeMethod === 'code' ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-950">Email code</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      One-time admin codes are not enabled on this host yet.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500"
                >
                  Email code pending
                </button>
              </div>
            ) : null}

            {activeMethod === 'password' ? (
              <form className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-white p-4" onSubmit={onSubmit} aria-describedby={error ? 'admin-login-error' : undefined}>
                <label className="block text-sm">
                  <span className="mb-2 block font-semibold text-slate-700">Username</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => onUsernameChange(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                    placeholder="info@bookedai.au"
                    autoComplete="username"
                    aria-label="Admin username"
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block font-semibold text-slate-700">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                    placeholder="Enter admin password"
                    autoComplete="current-password"
                    aria-label="Admin password"
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={!username || !password || loggingIn}
                  className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--apple-blue)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingIn ? 'Opening workspace…' : 'Sign in to admin'}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              </form>
            ) : null}

            {activeMethod !== 'password' ? (
              <button
                type="button"
                onClick={() => setActiveMethod('password')}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Use password instead
              </button>
            ) : null}

            {error ? (
              <div
                id="admin-login-error"
                role="alert"
                aria-live="polite"
                className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700"
              >
                {/Invalid credentials|invalid_credentials|incorrect/i.test(error)
                  ? "That username and password don't match. Try again or check your credentials."
                  : error}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                Session data is stored in browser session storage and cleared on logout or expiry.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
