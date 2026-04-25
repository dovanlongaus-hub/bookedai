import { FormEvent } from 'react';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
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
  return (
    <main className="min-h-screen overflow-x-clip bg-[#070a12] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white text-slate-950">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">admin.bookedai.au</div>
              <div className="truncate text-xs text-slate-400">Revenue operations control plane</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            API route secured
          </div>
        </header>

        <div className="grid flex-1 items-center gap-6 py-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.58fr)] lg:py-10">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(8,13,28,0.98)_46%,rgba(6,20,31,0.96))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.34)] sm:p-8 lg:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.9),rgba(16,185,129,0.75),transparent)]" />
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-100">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Enterprise Admin Portal
                </div>
                <div className="mt-6 max-w-[18rem] sm:max-w-[22rem]">
                  <LogoMark
                    variant="white"
                    className="booked-brand-image booked-brand-image--hero booked-brand-image--soft w-full opacity-95"
                  />
                </div>
                <h1 className="mt-7 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Command center for bookings, revenue flow, and operator intelligence.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                  {brandName} gives internal operators a clean control layer for live bookings,
                  payment posture, messaging, tenant support, and reliability review.
                </p>
                <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/80">
                  {brandDescriptor}
                </div>
              </div>

              <div className="grid gap-3">
                {[
                  { label: 'Booking ops', value: 'Live queue', icon: Activity },
                  { label: 'Revenue posture', value: 'Payment ready', icon: BadgeCheck },
                  { label: 'Platform control', value: 'API-backed', icon: ServerCog },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.16)]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-950">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-white">{item.value}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                            {item.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white p-5 text-slate-950 shadow-[0_30px_100px_rgba(15,23,42,0.22)] sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                  Secure sign in
                </div>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight">Access workspace</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Authenticate with the internal admin credential to open the BookedAI operator
                  workspace.
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <form className="mt-7 space-y-5" onSubmit={onSubmit}>
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-slate-700">Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                />
              </label>
              <button
                type="submit"
                disabled={!username || !password || loggingIn}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingIn ? 'Signing in...' : 'Sign in to admin'}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            </form>

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                {error}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                Session data is stored in browser session storage and cleared on logout or expiry.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
