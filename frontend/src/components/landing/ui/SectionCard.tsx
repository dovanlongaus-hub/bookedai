import type { ReactNode } from 'react';

type SectionCardProps = {
  children: ReactNode;
  className?: string;
  as?: 'article' | 'div' | 'section' | 'label';
  tone?: 'base' | 'subtle' | 'dark' | 'ghost';
};

const toneClasses: Record<NonNullable<SectionCardProps['tone']>, string> = {
  base: 'template-card',
  subtle: 'template-card-subtle',
  dark: 'template-card-dark',
  ghost: '',
};

export function SectionCard({
  children,
  className,
  as = 'div',
  tone = 'base',
}: SectionCardProps) {
  const Component = as;
  const classes = [toneClasses[tone], className].filter(Boolean).join(' ');

  return <Component className={classes}>{children}</Component>;
}
