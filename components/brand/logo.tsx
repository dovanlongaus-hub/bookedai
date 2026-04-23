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
  dark: "/branding/bookedai-logo-dark.webp?v=20260421-branding-suite",
  light: "/branding/bookedai-logo-light.webp?v=20260421-branding-suite",
  monoWhite: "/branding/bookedai-logo-dark.webp?v=20260421-branding-suite",
  monoBlack: "/branding/bookedai-logo-black.webp?v=20260421-branding-suite",
  icon: "/branding/bookedai-app-icon-1024.png?v=20260421-branding-suite",
  transparent: "/branding/bookedai-logo-transparent.webp?v=20260421-branding-suite",
};

export function Logo({
  variant = "dark",
  className = "",
  showTagline: _showTagline = false,
}: LogoProps) {
  const normalizedVariant = normalizeVariant(variant);
  const imageClassName =
    normalizedVariant === "dark"
      ? "rounded-[1rem] bg-white px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.16)]"
      : "";

  if (normalizedVariant === "icon") {
    return (
      <div className={`inline-flex flex-col ${className}`}>
        <img
          src={LOGO_SOURCES.icon}
          alt="BookedAI.au logo"
          className="h-auto w-[3.875rem]"
        />

      </div>
    );
  }

  if (normalizedVariant === "transparent") {
    return (
      <div className={`inline-flex flex-col ${className}`}>
        <img
          src={LOGO_SOURCES.transparent}
          alt="BookedAI.au logo"
          className={`h-auto w-[15rem] ${imageClassName}`.trim()}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <img
        src={LOGO_SOURCES[normalizedVariant]}
        alt="BookedAI.au logo"
        className={`h-auto w-full max-w-[15rem] ${imageClassName}`.trim()}
      />
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
