import type { ReactNode } from 'react';

type SectionShellProps = {
  id?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  width?: 'default' | 'wide';
};

const widthClasses: Record<NonNullable<SectionShellProps['width']>, string> = {
  default: 'max-w-7xl',
  wide: 'max-w-[88rem]',
};

export function SectionShell({
  id,
  children,
  className,
  contentClassName,
  width = 'default',
}: SectionShellProps) {
  return (
    <section id={id} className={className}>
      <div
        className={[
          'mx-auto w-full px-6 lg:px-8',
          widthClasses[width],
          contentClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </section>
  );
}
