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
        <p className={`apple-kicker text-sm font-semibold ${kickerClassName}`}>
          {kicker}
        </p>
      ) : null}
      <h2 className="apple-title mt-3 max-w-2xl text-4xl font-semibold text-[#1d1d1f] sm:text-5xl">
        {title}
      </h2>
      <p className="apple-body mt-4 max-w-2xl text-base leading-7 sm:text-lg">
        {body}
      </p>
    </div>
  );
}
