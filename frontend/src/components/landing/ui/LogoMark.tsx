import { useState } from 'react';
import {
  brandLogoOnDarkPath,
  brandLogoPath,
  brandName,
  brandPreferredLogoPath,
} from '../data';

type LogoMarkProps = {
  className?: string;
  alt?: string;
  variant?: 'light' | 'dark';
};

export function LogoMark({
  className = 'booked-brand-image',
  alt,
  variant = 'light',
}: LogoMarkProps) {
  const logoCandidates = variant === 'dark'
    ? [brandPreferredLogoPath, brandLogoOnDarkPath, brandLogoPath]
    : [brandPreferredLogoPath, brandLogoPath, brandLogoOnDarkPath];
  const [logoIndex, setLogoIndex] = useState(0);
  const logoPath = logoCandidates[Math.min(logoIndex, logoCandidates.length - 1)];

  return (
    <img
      src={logoPath}
      alt={alt ?? `${brandName} logo`}
      className={className}
      loading="eager"
      decoding="async"
      onError={() => {
        setLogoIndex((current) => {
          if (current >= logoCandidates.length - 1) {
            return current;
          }

          return current + 1;
        });
      }}
    />
  );
}
