import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/auth/admin-login-form";
import { getAdminSession } from "@/lib/auth/session";

export default async function AdminLoginPage() {
  try {
    await getAdminSession();
    redirect("/admin");
  } catch {
    // fall through to login form
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-6 py-16">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl items-center gap-12 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <section className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">BookedAI.au</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-5xl">
            Revenue operations access for the teams who keep tenant growth moving.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">
            The root admin workspace now uses email verification codes by default so shared bootstrap passwords are no
            longer the everyday login path.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              "One-time verification codes expire in 10 minutes.",
              "Admin sessions are signed with the dedicated admin session secret.",
              "Legacy tenant memberships remain a compatibility identity source until Prisma promotion is complete.",
              "Bootstrap password login is kept only as an explicit break-glass fallback.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>

        <div className="w-full lg:justify-self-end">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
