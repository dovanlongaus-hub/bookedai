import * as React from "react";

type LogoVariant =
  | "dark"
  | "light"
  | "monoWhite"
  | "monoBlack"
  | "white"
  | "black"
  | "icon"
  | "transparent";

export type LogoProps = {
  variant?: LogoVariant;
  className?: string;
  showTagline?: boolean;
};

function normalizeVariant(variant: LogoVariant | undefined) {
  if (variant === "white") {
    return "monoWhite";
  }

  if (variant === "black") {
    return "monoBlack";
  }

  return variant ?? "dark";
}

const LOGO_SOURCES: Record<Exclude<ReturnType<typeof normalizeVariant>, "icon" | "transparent"> | "icon" | "transparent", string> = {
  dark: "/branding/bookedai-logo-dark-badge.png?v=20260418-brand-system",
  light: "/branding/bookedai-logo-light.png?v=20260418-brand-system",
  monoWhite: "/branding/bookedai-logo-dark-badge.png?v=20260418-brand-system",
  monoBlack: "/branding/bookedai-logo-black.png?v=20260418-brand-system",
  icon: "/branding/bookedai-app-icon-1024.png?v=20260418-brand-system",
  transparent: "/branding/bookedai-logo-light.png?v=20260418-brand-system",
};

export function Logo({
  variant = "dark",
  className = "",
  showTagline = false,
}: LogoProps) {
  const normalizedVariant = normalizeVariant(variant);

  if (normalizedVariant === "icon") {
    return (
      <div className={`inline-flex flex-col ${className}`}>
        <img
          src={LOGO_SOURCES.icon}
          alt="BookedAI.au logo"
          className="h-auto w-[3.875rem]"
        />

        {showTagline ? (
          <span className="mt-1 text-xs tracking-[0.24em] text-brand-muted uppercase">
            The AI Revenue Engine
          </span>
        ) : null}
      </div>
    );
  }

  if (normalizedVariant === "transparent") {
    return (
      <div className={`inline-flex flex-col ${className}`}>
        <img
          src={LOGO_SOURCES.transparent}
          alt="BookedAI.au logo"
          className="h-auto w-[15rem]"
        />

        {showTagline ? (
          <span className="mt-1 text-xs tracking-[0.24em] text-brand-muted uppercase">
            The AI Revenue Engine
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <img
        src={LOGO_SOURCES[normalizedVariant]}
        alt="BookedAI.au logo"
        className="h-auto w-full max-w-[15rem]"
      />

      {showTagline && (
        <span className="mt-1 text-xs tracking-[0.24em] text-brand-muted uppercase">
          The AI Revenue Engine
        </span>
      )}
    </div>
  );
}

export function LogoIcon({
  alt = "BookedAI.au icon",
  className,
  ...props
}: Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src">) {
  return (
    <img
      src={LOGO_SOURCES.icon}
      alt={alt}
      className={className}
      {...props}
    />
  );
}
