import * as React from "react";

function cn(...values: Array<string | undefined | null | false>) {
  return values.filter(Boolean).join(" ");
}

const variants = {
  primary:
    "border border-primaryBlue/20 bg-[image:var(--brandGradient)] text-textPrimary shadow-glow hover:translate-y-[-1px] hover:brightness-105",
  secondary:
    "border border-border bg-surfaceAlt text-textPrimary hover:translate-y-[-1px] hover:bg-white/10",
  ghost:
    "border border-transparent bg-transparent text-textSecondary hover:translate-y-[-1px] hover:text-textPrimary hover:bg-white/5",
};

const sizes = {
  sm: "min-h-[44px] px-4 py-2.5 text-sm",
  md: "min-h-[52px] px-5 py-3 text-sm sm:text-base",
  lg: "min-h-[56px] px-6 py-3.5 text-base",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-pill font-semibold tracking-[-0.02em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryBlue focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
