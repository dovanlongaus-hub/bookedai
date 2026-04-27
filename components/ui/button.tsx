import Link from "next/link";
import { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const styles = {
  primary:
    "bg-[oklch(0.58_0.2_258)] text-white shadow-[0_18px_40px_rgba(37,99,235,0.28)] hover:bg-[oklch(0.54_0.2_258)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.72_0.14_248)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
  secondary:
    "border border-white/14 bg-white/8 text-brand-text hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
  ghost:
    "bg-transparent text-brand-text hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
} as const;

const sizes = {
  sm: "px-4 py-2.5 text-sm",
  md: "px-5 py-3 text-sm",
  lg: "px-6 py-3.5 text-base",
} as const;

export function Button({
  children,
  href = "#",
  variant = "primary",
  size = "md",
  className = "",
}: ButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${styles[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </Link>
  );
}
