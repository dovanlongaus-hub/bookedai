import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function AdminCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </section>
  );
}
