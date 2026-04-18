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
  primary: "bg-brand-blue text-white hover:opacity-95 shadow-glow",
  secondary: "bg-white/5 text-brand-text border border-white/10 hover:bg-white/10",
  ghost: "bg-transparent text-brand-text hover:bg-white/5",
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
      className={`inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 ${styles[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </Link>
  );
}
