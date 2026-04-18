import {
  brandDescriptor,
  brandDomainLabel,
  brandLandingDarkSurfaceLogoPath,
  brandLandingLightSurfaceLogoPath,
} from '../data';
import { LogoMark } from './LogoMark';
import { SignalPill } from './SignalPill';

type BrandLockupProps = {
  className?: string;
  logoClassName?: string;
  logoSrc?: string;
  descriptorClassName?: string;
  eyebrowClassName?: string;
  showDescriptor?: boolean;
  showEyebrow?: boolean;
  compact?: boolean;
  surface?: 'dark' | 'light';
  eyebrowLabel?: string;
};

export function BrandLockup({
  className,
  logoClassName,
  logoSrc,
  descriptorClassName,
  eyebrowClassName,
  showDescriptor = true,
  showEyebrow = true,
  compact = false,
  surface = 'dark',
  eyebrowLabel = 'Revenue engine',
}: BrandLockupProps) {
  const isDark = surface === 'dark';
  const logoVariant = isDark ? 'white' : 'black';
  const descriptorTone = isDark ? 'text-white/62' : 'text-black/58';
  const eyebrowVariant = isDark ? 'inverse' : 'soft';
  const compactFrameClass = isDark
    ? 'ring-1 ring-white/10'
    : 'border border-black/6 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]';

  return (
    <div className={['flex min-w-0 items-center gap-3', className].filter(Boolean).join(' ')}>
      {compact ? (
        <LogoMark
          variant="icon"
          alt={brandDomainLabel}
          className={`h-10 w-10 shrink-0 rounded-[1rem] ${compactFrameClass}`}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <LogoMark
          src={logoSrc ?? (isDark ? brandLandingDarkSurfaceLogoPath : brandLandingLightSurfaceLogoPath)}
          variant={logoVariant}
          alt={brandDomainLabel}
          className={[
            'booked-brand-image booked-brand-image--frameless origin-left',
            compact ? 'hidden sm:block' : '',
            logoClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        />

        {showEyebrow || showDescriptor ? (
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
            {showEyebrow ? (
              <SignalPill
                variant={eyebrowVariant}
                className={[
                  'px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]',
                  eyebrowClassName,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {eyebrowLabel}
              </SignalPill>
            ) : null}

            {showDescriptor ? (
              <span
                className={[
                  'min-w-0 text-[11px] leading-5',
                  descriptorTone,
                  descriptorClassName,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {brandDescriptor}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
