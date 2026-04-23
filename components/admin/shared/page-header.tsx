import { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {eyebrow}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}
