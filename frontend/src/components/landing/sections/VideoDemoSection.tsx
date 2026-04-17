import type { VideoDemoContent } from '../data';

type VideoDemoSectionProps = {
  content: VideoDemoContent;
};

export function VideoDemoSection({ content }: VideoDemoSectionProps) {
  return (
    <section id="demo" className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-8">
      <div className="grid gap-8 rounded-[2.5rem] border border-black/5 bg-white p-8 shadow-[0_28px_80px_rgba(15,23,42,0.06)] lg:grid-cols-[1.05fr_0.95fr] lg:p-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
            {content.kicker}
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {content.title}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            {content.body}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {['Fast to scan', 'Easy to explain', 'Strong enough to sell'].map((item) => (
              <div key={item} className="rounded-[1.2rem] bg-[#f5f5f7] px-4 py-3 text-sm font-medium text-slate-700">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a
              href={content.primaryHref}
              className="rounded-full bg-slate-950 px-6 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
            >
              {content.primaryCta}
            </a>
            <a
              href={content.secondaryHref}
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-black/15 hover:bg-slate-50"
            >
              {content.secondaryCta}
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="text-sm font-semibold text-slate-950">Salon Demo Storyboard</div>
              <div className="mt-1 text-xs text-slate-500">
                Wedding haircut booking flow for tomorrow
              </div>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Ready
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {content.highlights.map((highlight, index) => (
              <div
                key={highlight}
                className="flex items-start gap-3 rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.03)]"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-sky-700">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-slate-600">{highlight}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: 'Enquiry',
                body: 'A buyer asks naturally, like they would in real life.',
              },
              {
                title: 'Recommendation',
                body: 'The strongest option is surfaced with reasons to trust it.',
              },
              {
                title: 'Booking',
                body: 'The story ends with a buying step, not just another reply.',
              },
            ].map((item) => (
              <article key={item.title} className="rounded-[1.3rem] bg-slate-950 px-4 py-4 text-white">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                  {item.title}
                </div>
                <div className="mt-2 text-sm leading-6 text-white/85">{item.body}</div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
