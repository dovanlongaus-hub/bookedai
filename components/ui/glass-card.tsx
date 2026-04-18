import * as React from "react";

function cn(...values: Array<string | undefined | null | false>) {
  return values.filter(Boolean).join(" ");
}

export type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  glow?: boolean;
};

export function GlassCard({ className, glow = false, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-lg p-6",
        glow ? "gradient-card" : "",
        className,
      )}
      {...props}
    />
  );
}
