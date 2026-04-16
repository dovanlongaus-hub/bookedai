import type { TechnicalArchitectureContent } from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type TechnicalArchitectureSectionProps = {
  content: TechnicalArchitectureContent;
};

export function TechnicalArchitectureSection({
  content,
}: TechnicalArchitectureSectionProps) {
  return (
    <section
      id="technical-architecture"
      className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-8 lg:py-32"
    >
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="space-y-8">
          <SectionHeading {...content} />
          <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            {content.lead}
          </p>
        </div>

        <div className="grid gap-4">
          {content.principles.map((principle) => (
            <article
              key={principle.title}
              className="rounded-[2rem] border border-black/5 bg-white/90 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.04)]"
            >
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                {principle.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {principle.body}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-16 grid gap-5 lg:mt-20 lg:grid-cols-2">
        {content.layers.map((layer) => (
          <article
            key={layer.name}
            className="rounded-[2.25rem] border border-black/5 bg-white p-8 shadow-[0_22px_70px_rgba(15,23,42,0.05)]"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Layer
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {layer.name}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{layer.summary}</p>

            <div className="mt-8 space-y-4">
              {layer.items.map((item) => (
                <div
                  key={item.name}
                  className="rounded-[1.5rem] bg-[#f8f8fa] px-5 py-4"
                >
                  <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-16 rounded-[2.5rem] border border-black/5 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.05)] sm:px-8 sm:py-10 lg:mt-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Tech Stack
          </div>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Full-stack building blocks, grouped by responsibility
          </h3>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Each category lists five concrete stack elements so the architecture reads as an
            implementation plan, not just an abstract diagram.
          </p>
        </div>

        <div className="mt-10 grid gap-5 xl:grid-cols-2">
          {content.techStackCategories.map((category) => (
            <article
              key={category.name}
              className="rounded-[2rem] bg-[#f8f8fa] p-6"
            >
              <h4 className="text-lg font-semibold tracking-tight text-slate-950">
                {category.name}
              </h4>
              <div className="mt-6 space-y-3">
                {category.items.map((item) => (
                  <div
                    key={item.name}
                    className="flex flex-col gap-1 rounded-[1.25rem] border border-white bg-white px-4 py-4"
                  >
                    <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                    <p className="text-sm leading-7 text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
