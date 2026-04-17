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
    <div className="max-w-[48rem]">
      {kicker ? (
        <p className={`template-kicker text-sm font-semibold ${kickerClassName}`}>
          {kicker}
        </p>
      ) : null}
      <h2 className="template-title mt-4 max-w-4xl text-[2.15rem] font-semibold leading-[0.97] text-[#1d1d1f] sm:text-[2.8rem] lg:text-[3.35rem]">
        {title}
      </h2>
      <p className="template-body mt-5 max-w-3xl text-[1rem] leading-7 sm:text-[1.08rem] sm:leading-8">
        {body}
      </p>
    </div>
  );
}
