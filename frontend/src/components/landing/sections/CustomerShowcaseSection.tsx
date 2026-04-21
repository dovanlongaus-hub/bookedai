import type {
  CustomerProduct,
  CustomerShowcaseContent,
} from '../data';

type CustomerShowcaseSectionProps = {
  content: CustomerShowcaseContent;
  products: CustomerProduct[];
};

export function CustomerShowcaseSection({
  content,
  products,
}: CustomerShowcaseSectionProps) {
  const bookedAiProductHost = 'product.bookedai.au';
  const bookedAiDemoHost = 'demo.bookedai.au';
  const getActionLabel = (href: string) => {
    try {
      const hostname = new URL(href).hostname;
      if (hostname === bookedAiProductHost) {
        return 'View product';
      }
      if (hostname === bookedAiDemoHost) {
        return 'View demo';
      }
      return 'Visit customer product';
    } catch {
      return 'Visit customer product';
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-8">
      <div className="rounded-[2.5rem] border border-black/5 bg-white p-8 shadow-[0_28px_80px_rgba(15,23,42,0.06)] lg:p-12">
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${content.kickerClassName}`}>
          {content.kicker}
        </p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              {content.title}
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">{content.body}</p>

            <div className="mt-8 rounded-[2rem] border border-slate-200 bg-[#fbfbfd] p-7">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600">
                {content.customerName}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {content.customerSummary}
              </p>
              <a
                href={content.customerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-black/15 hover:bg-slate-50"
              >
                Visit novoprints.com.au
              </a>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <article
                key={product.name}
                className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-[#fbfbfd] p-6"
              >
                <div className="text-sm font-semibold text-amber-600">Featured product</div>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">{product.name}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {product.description}
                </p>
                <a
                  href={product.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto pt-5 inline-flex text-sm font-semibold text-sky-700 transition hover:text-sky-800"
                >
                  {getActionLabel(product.href)}
                </a>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
