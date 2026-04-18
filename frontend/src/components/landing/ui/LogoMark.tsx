import { useState } from 'react';
import {
  brandFaviconPath,
  brandLogoBlackPath,
  brandLogoOnDarkPath,
  brandLogoPath,
  brandName,
  brandPreferredLogoPath,
  brandLogoTransparentPath,
} from '../data';

type LogoMarkProps = {
  className?: string;
  alt?: string;
  variant?: 'light' | 'dark' | 'transparent' | 'white' | 'black' | 'icon';
  src?: string;
};

export function LogoMark({
  className = 'booked-brand-image',
  alt,
  variant = 'light',
  src,
}: LogoMarkProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? `${brandName} logo`}
        className={className}
        loading="eager"
        decoding="async"
      />
    );
  }

  const logoCandidates = variant === 'dark' || variant === 'white'
    ? [brandLogoOnDarkPath, brandLogoTransparentPath, brandPreferredLogoPath]
    : variant === 'transparent'
      ? [brandLogoTransparentPath, brandPreferredLogoPath, brandLogoOnDarkPath]
      : variant === 'black'
        ? [brandLogoBlackPath, brandPreferredLogoPath, brandLogoTransparentPath]
        : variant === 'icon'
          ? [brandFaviconPath]
          : [brandPreferredLogoPath, brandLogoPath, brandLogoBlackPath];
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
