import { Droplet, Waves, Activity, Trophy, ArrowRight, Users, Clock } from 'lucide-react';

import type { Level } from '../../apps/public/futureswim/levels';

type LevelCardProps = {
  level: Level;
  onChoose: (levelCode: Level['code']) => void;
};

const ICONS = {
  droplet: Droplet,
  waves: Waves,
  activity: Activity,
  trophy: Trophy,
} as const;

export function LevelCard({ level, onChoose }: LevelCardProps) {
  const Icon = ICONS[level.iconKey];
  return (
    <article className="fs-card flex h-full flex-col">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, var(--fs-primary) 0%, var(--fs-primary-dark) 100%)',
            color: '#fff',
          }}
        >
          <Icon size={22} aria-hidden />
        </span>
        <div>
          <div className="fs-kicker">Level {level.order}</div>
          <h3 className="text-2xl font-bold tracking-tight text-[color:var(--fs-text)]">
            {level.name}
          </h3>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="fs-chip">
          <Clock size={14} aria-hidden="true" />
          {level.ageBand}
        </span>
        <span className="fs-chip-neutral fs-chip">
          <Users size={14} aria-hidden="true" />
          Max {level.classSize}
        </span>
        {level.parentInWater ? (
          <span className="fs-chip-coral fs-chip">Parent in water</span>
        ) : (
          <span className="fs-chip-warm fs-chip">Independent</span>
        )}
      </div>

      <p className="mt-4 text-[0.95rem] leading-7 text-[color:var(--fs-text-muted)]">
        {level.summary}
      </p>

      <div className="mt-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--fs-text-soft)]">
          What you&apos;ll learn
        </div>
        <ul className="mt-3 space-y-2 text-sm text-[color:var(--fs-text)]">
          {level.learningOutcomes.map((outcome) => (
            <li key={outcome} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[color:var(--fs-primary)]" />
              <span className="leading-6">{outcome}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 pt-2">
        <button
          type="button"
          onClick={() => onChoose(level.code)}
          className="fs-button"
          aria-label={`Choose ${level.name} and view available centres`}
        >
          Choose this level
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
