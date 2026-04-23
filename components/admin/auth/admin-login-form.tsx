"use client";

import { FormEvent, useState, useTransition } from "react";

import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";
import { AdminInput } from "@/components/ui/admin-input";

type RequestCodeResponse = {
  codeLast4?: string;
  expiresInMinutes?: number;
  operatorNote?: string;
  debugCode?: string | null;
};

function getErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return fallback;
}

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [code, setCode] = useState("");
  const [requestState, setRequestState] = useState<RequestCodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/auth/request-code", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          tenantSlug: tenantSlug || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; data?: RequestCodeResponse; error?: { message?: string } }
        | null;

      if (!response.ok || !payload?.ok) {
        setRequestState(null);
        setError(getErrorMessage(payload, "Unable to send the verification code."));
        return;
      }

      setRequestState(payload.data ?? null);
      setMessage(payload.data?.operatorNote || "Verification code requested.");
    });
  }

  function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/auth/verify-code", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          tenantSlug: tenantSlug || undefined,
          code,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } } | null;

      if (!response.ok || !payload?.ok) {
        setError(getErrorMessage(payload, "Unable to verify the code."));
        return;
      }

      window.location.href = "/admin";
    });
  }

  return (
    <AdminCard className="w-full max-w-xl border-white/10 bg-slate-950/80 text-slate-50 shadow-2xl shadow-slate-950/40">
      <div className="border-b border-white/10 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Admin Workspace</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Sign in with a one-time code</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Enter your work email to receive a 6-digit verification code for the BookedAI admin workspace.
        </p>
      </div>

      <div className="space-y-6 px-6 py-6">
        <form className="space-y-4" onSubmit={handleRequestCode}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Work email</span>
            <AdminInput
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="operator@bookedai.au"
              className="border-white/15 bg-slate-900 text-white placeholder:text-slate-500"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Tenant slug</span>
            <AdminInput
              value={tenantSlug}
              onChange={(event) => setTenantSlug(event.target.value)}
              placeholder="future-swim"
              className="border-white/15 bg-slate-900 text-white placeholder:text-slate-500"
            />
          </label>

          <AdminButton type="submit" className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400" disabled={isPending}>
            {isPending ? "Sending code..." : "Request verification code"}
          </AdminButton>
        </form>

        <form className="space-y-4" onSubmit={handleVerifyCode}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Verification code</span>
            <AdminInput
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D+/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              pattern="\\d{6}"
              className="border-white/15 bg-slate-900 text-white placeholder:text-slate-500"
              required
            />
          </label>

          <AdminButton type="submit" className="w-full" disabled={isPending || !requestState}>
            {isPending ? "Verifying..." : "Verify code and continue"}
          </AdminButton>
        </form>

        {message ? (
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <p>{message}</p>
            {requestState?.codeLast4 ? <p className="mt-1">Code ending in {requestState.codeLast4} is active.</p> : null}
            {requestState?.expiresInMinutes ? (
              <p className="mt-1">It expires in {requestState.expiresInMinutes} minutes.</p>
            ) : null}
            {requestState?.debugCode ? (
              <p className="mt-1 font-medium text-emerald-50">Development code: {requestState.debugCode}</p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </div>
    </AdminCard>
  );
}
