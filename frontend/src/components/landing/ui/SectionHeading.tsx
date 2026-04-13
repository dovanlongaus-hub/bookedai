type SectionHeadingProps = {
  kicker: string;
  kickerClassName: string;
  title: string;
  body: string;
};

export function SectionHeading({
  kicker,
  kickerClassName,
  title,
  body,
}: SectionHeadingProps) {
  return (
    <div className="max-w-3xl">
      {kicker ? (
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${kickerClassName}`}>
          {kicker}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-lg leading-8 text-slate-600">{body}</p>
    </div>
  );
}
