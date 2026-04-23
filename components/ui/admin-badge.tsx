import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function AdminBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        tone === "default" && "bg-slate-100 text-slate-700",
        tone === "success" && "bg-emerald-100 text-emerald-800",
        tone === "warning" && "bg-amber-100 text-amber-800",
        tone === "danger" && "bg-rose-100 text-rose-800",
        tone === "info" && "bg-sky-100 text-sky-800",
      )}
    >
      {children}
    </span>
  );
}
