import { brandLogoPath, brandName } from '../data';

type LogoMarkProps = {
  className?: string;
  alt?: string;
};

export function LogoMark({ className = 'h-full w-full object-contain', alt }: LogoMarkProps) {
  return (
    <img
      src={brandLogoPath}
      alt={alt ?? `${brandName} logo`}
      className={className}
      loading="eager"
      decoding="async"
    />
  );
}
