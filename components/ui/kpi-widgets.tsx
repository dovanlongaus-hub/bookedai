import { type ReactNode } from "react";

import { GlassCard } from "@/components/ui/glass-card";

export type Tone = "default" | "green" | "amber" | "blue";

function toneClass(tone: Tone) {
  if (tone === "green") {
    return "text-brand-green";
  }

  if (tone === "amber") {
    return "text-brand-amber";
  }

  if (tone === "blue") {
    return "text-brand-blue";
  }

  return "text-brand-text";
}

export function StatPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
      <div className="text-xs uppercase tracking-[0.22em] text-brand-muted">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-brand-text">{value}</div>
    </div>
  );
}

export function MiniMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <GlassCard className="p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-brand-muted">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${toneClass(tone)}`}>{value}</div>
    </GlassCard>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  body: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <div className="text-xs uppercase tracking-[0.24em] text-brand-muted">
        {eyebrow}
      </div>
      <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-lg leading-8 text-brand-muted">{body}</p>
    </div>
  );
}

export function ProofQuote({
  quote,
  author,
  role,
  stat,
}: {
  quote: string;
  author: string;
  role: string;
  stat: string;
}) {
  return (
    <GlassCard className="h-full p-6 lg:p-7">
      <div className="text-sm leading-8 text-brand-text">“{quote}”</div>
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">{author}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-brand-muted">
            {role}
          </div>
        </div>
        <div className="rounded-full bg-brand-blue/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
          {stat}
        </div>
      </div>
    </GlassCard>
  );
}

export function MetricList({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <GlassCard className="p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-4 space-y-3 text-sm">{children}</div>
    </GlassCard>
  );
}
