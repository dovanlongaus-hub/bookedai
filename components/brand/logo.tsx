import * as React from "react";

type LogoVariant = "dark" | "light" | "icon" | "white" | "black" | "transparent";

const logoMap: Record<LogoVariant, string> = {
  dark: "/branding/bookedai-revenue-engine-dark.svg",
  light: "/branding/bookedai-revenue-engine-light.svg",
  icon: "/branding/bookedai-revenue-engine-icon.svg",
  white: "/branding/bookedai-revenue-engine-white.svg",
  black: "/branding/bookedai-revenue-engine-black.svg",
  transparent: "/branding/bookedai-revenue-engine-transparent.svg",
};

export type LogoProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  variant?: LogoVariant;
  alt?: string;
};

export function Logo({
  variant = "dark",
  alt = "BookedAI.au logo",
  className,
  ...props
}: LogoProps) {
  return <img src={logoMap[variant]} alt={alt} className={className} {...props} />;
}

export function LogoIcon({
  alt = "BookedAI.au icon",
  className,
  ...props
}: Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src">) {
  return <img src={logoMap.icon} alt={alt} className={className} {...props} />;
}
