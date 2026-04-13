import type { SectionContent, ShowcaseImage } from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type ShowcaseSectionProps = {
  content: SectionContent;
  images: ShowcaseImage[];
};

export function ShowcaseSection({ content, images }: ShowcaseSectionProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-8">
      <SectionHeading {...content} />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-2xl shadow-black/20">
          <img
            src={images[0].src}
            alt={images[0].alt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="border-t border-slate-800 bg-slate-950/90 px-6 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
              {images[0].eyebrow}
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {images[0].title}
            </div>
          </div>
        </article>

        <div className="grid gap-6">
          {images.slice(1).map((image) => (
            <article
              key={image.src}
              className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10"
            >
              <img
                src={image.src}
                alt={image.alt}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="border-t border-slate-800 bg-slate-950/90 px-6 py-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                  {image.eyebrow}
                </div>
                <div className="mt-2 text-base font-semibold text-white">
                  {image.title}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
