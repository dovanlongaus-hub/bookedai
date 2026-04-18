import type { ReactNode } from 'react';

type SectionHeadingProps = {
  kicker: string;
  kickerClassName: string;
  title: string;
  body: string;
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
  kickerToneClassName?: string;
  align?: 'left' | 'center';
  actions?: ReactNode;
  children?: ReactNode;
};

export function SectionHeading({
  kicker,
  kickerClassName,
  title,
  body,
  className,
  titleClassName,
  bodyClassName,
  kickerToneClassName,
  align = 'left',
  actions,
  children,
}: SectionHeadingProps) {
  const alignClasses = align === 'center' ? 'mx-auto text-center' : '';

  return (
    <div className={['max-w-[34rem]', alignClasses, className].filter(Boolean).join(' ')}>
      {kicker ? (
        <p
          className={[
            'template-kicker text-sm font-semibold',
            kickerClassName,
            kickerToneClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {kicker}
        </p>
      ) : null}
      <h2
        className={[
          'template-title mt-4 max-w-4xl text-[2.15rem] font-semibold leading-[0.97] text-[#1d1d1f] sm:text-[2.8rem] lg:text-[3.35rem]',
          titleClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {title}
      </h2>
      <p
        className={[
          'template-body mt-5 max-w-[30rem] text-[0.98rem] leading-7 text-black/68 sm:text-[1.03rem] sm:leading-7',
          bodyClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {body}
      </p>
      {actions ? <div className="mt-6">{actions}</div> : null}
      {children}
    </div>
  );
}
