import { useEffect, useMemo, useState } from 'react';

import { fallbackPartners, type PartnersSectionContent } from '../data';
import { getApiBaseUrl, shouldUseLocalStaticPublicData } from '../../../shared/config/api';
import { SectionHeading } from '../ui/SectionHeading';

type PartnerProfileItem = {
  id: number;
  name: string;
  category: string | null;
  website_url: string | null;
  description: string | null;
  logo_url: string | null;
  image_url: string | null;
  featured: boolean;
  sort_order: number;
  is_active: boolean;
};

type PartnerProfileListResponse = {
  status: string;
  items: PartnerProfileItem[];
};

type PartnersSectionProps = {
  content: PartnersSectionContent;
};

function isInfrastructurePartner(item: PartnerProfileItem) {
  const category = (item.category ?? '').toLowerCase();
  const name = item.name.toLowerCase();

  return (
    category.includes('crm') ||
    category.includes('email') ||
    category.includes('cloud') ||
    category.includes('ai model') ||
    category.includes('payments') ||
    category.includes('workflow') ||
    category.includes('backend platform') ||
    name.includes('zoho') ||
    name.includes('google for startups') ||
    name.includes('openai') ||
    name.includes('stripe') ||
    name.includes('n8n') ||
    name.includes('supabase')
  );
}

function isWideWordmarkPartner(item: PartnerProfileItem) {
  const name = item.name.toLowerCase();

  return (
    name.includes('google for startups') ||
    name.includes('zoho for startups') ||
    name.includes('openai for startups') ||
    name.includes('codex property') ||
    name.includes('auzland')
  );
}

function getPartnerLogoFrameClass(item: PartnerProfileItem) {
  return isWideWordmarkPartner(item)
    ? 'h-28 px-5 py-4'
    : 'h-24 px-4 py-3';
}

function getPartnerLogoImageClass(item: PartnerProfileItem) {
  return isWideWordmarkPartner(item)
    ? 'max-h-full w-full max-w-[86%] object-contain'
    : 'max-h-full w-full max-w-full object-contain';
}

export function PartnersSection({ content }: PartnersSectionProps) {
  const [items, setItems] = useState<PartnerProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPartners() {
      if (shouldUseLocalStaticPublicData()) {
        setLoading(false);
        setError('');
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await fetch(`${getApiBaseUrl()}/partners`);
        const payload = (await response.json().catch(() => null)) as PartnerProfileListResponse | {
          detail?: string;
        } | null;

        if (!response.ok) {
          throw new Error(
            payload && 'detail' in payload && payload.detail
              ? payload.detail
              : 'Could not load partner profiles.',
          );
        }

        if (!cancelled) {
          setItems((payload as PartnerProfileListResponse).items);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(visibleFallbackError(requestError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPartners();
    return () => {
      cancelled = true;
    };
  }, []);

  const approvedPartnerNames = useMemo(
    () => new Set(fallbackPartners.map((partner) => partner.name.trim().toLowerCase())),
    [],
  );

  const mergedItems = useMemo(
    () =>
      [
        ...fallbackPartners.map<PartnerProfileItem>((partner, index) => ({
          id: -1000 - index,
          name: partner.name,
          category: partner.category,
          website_url: partner.websiteUrl,
          description: partner.description,
          logo_url: partner.logoUrl,
          image_url: partner.imageUrl,
          featured: partner.featured,
          sort_order: index,
          is_active: true,
        })),
        ...items,
      ]
        .filter((item) => approvedPartnerNames.has(item.name.trim().toLowerCase()))
        .filter(
          (item, index, array) =>
            array.findIndex(
              (candidate) =>
                candidate.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
            ) === index,
        )
        .sort((left, right) => left.sort_order - right.sort_order),
    [approvedPartnerNames, items],
  );

  const visibleItems = mergedItems.filter((item) => item.logo_url || item.image_url);
  const infrastructurePartners = visibleItems.filter(isInfrastructurePartner);
  const ecosystemPartners = visibleItems.filter((item) => !isInfrastructurePartner(item));
  const trustSignals = [
    `${visibleItems.length || fallbackPartners.length} visible trust points`,
    'Startup infrastructure plus real ecosystem presence',
    'Curated to support buyer confidence, not just decorate the page',
  ];

  return (
    <section id="partners" className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <div className="template-card p-7 lg:p-8">
          <SectionHeading
            kicker={content.kicker}
            kickerClassName={content.kickerClassName}
            title={content.title}
            body={content.body}
          />

          <div className="mt-7 grid gap-3">
            {content.stats.map((item) => (
              <div
                key={item}
                className="rounded-[1.2rem] border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_14px_35px_rgba(15,23,42,0.04)]"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="booked-note-surface mt-5 p-5">
            <div className="template-kicker text-[11px]">
              Trust frame
            </div>
            <div className="mt-3 grid gap-3">
              {trustSignals.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.15rem] bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.9rem] border border-black/5 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_22px_60px_rgba(15,23,42,0.07)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Partner trust
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-950">
                Startup-backed infrastructure plus visible ecosystem momentum
              </div>
            </div>
            <div className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              {visibleItems.length} partners
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
              Loading partner profiles...
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
              {error}
            </div>
          ) : null}

          {!loading && visibleItems.length > 0 ? (
            <div className="mt-6 space-y-5">
              <section className="rounded-[1.5rem] border border-sky-100 bg-sky-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      Infrastructure support
                    </div>
                    <div className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                      Startup programs and platforms helping BookedAI ship faster
                    </div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 ring-1 ring-sky-100">
                    {infrastructurePartners.length} logos
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {infrastructurePartners.map((item) => (
                    <a
                      key={item.id}
                      href={item.website_url ?? '#partners'}
                      target={item.website_url ? '_blank' : undefined}
                      rel={item.website_url ? 'noreferrer' : undefined}
                      className="min-h-[13rem] overflow-hidden rounded-[1.2rem] border border-sky-100 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex h-full min-w-0 flex-col">
                        <div
                          className={`flex items-center justify-center rounded-[1rem] border border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#f8fafc_100%)] ${getPartnerLogoFrameClass(item)}`}
                        >
                          <img
                            src={item.logo_url ?? item.image_url ?? ''}
                            alt={`${item.name} logo`}
                            className={getPartnerLogoImageClass(item)}
                            loading="lazy"
                          />
                        </div>
                        <div className="mt-4 flex min-h-[4.25rem] flex-1 flex-col">
                          <div className="line-clamp-2 break-words text-[15px] font-semibold leading-5 text-slate-950">
                            {item.name}
                          </div>
                          <div className="mt-1 line-clamp-2 break-words text-[12px] font-medium leading-4 text-sky-700">
                            {item.category ?? 'Infrastructure partner'}
                          </div>
                          <div className="mt-auto pt-3 text-[11px] leading-4 text-slate-500">
                            Startup support
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Ecosystem and client visibility
                    </div>
                    <div className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                      Customer and ecosystem logos sized to stay inside the landing layout
                    </div>
                  </div>
                  <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    Responsive grid
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {ecosystemPartners.map((item) => (
                    <a
                      key={item.id}
                      href={item.website_url ?? '#partners'}
                      target={item.website_url ? '_blank' : undefined}
                      rel={item.website_url ? 'noreferrer' : undefined}
                      className="min-h-[13rem] overflow-hidden rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex h-full min-w-0 flex-col">
                        <div
                          className={`flex items-center justify-center overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-50 ${getPartnerLogoFrameClass(item)}`}
                        >
                          <img
                            src={item.image_url ?? item.logo_url ?? ''}
                            alt={item.name}
                            className={getPartnerLogoImageClass(item)}
                            loading="lazy"
                          />
                        </div>
                        <div className="mt-4 flex min-h-[4.25rem] flex-1 flex-col">
                          <div className="line-clamp-2 break-words text-[15px] font-semibold leading-5 text-slate-950">
                            {item.name}
                          </div>
                          <div className="mt-1 line-clamp-2 break-words text-[12px] font-medium leading-4 text-emerald-700">
                            {item.category ?? 'Partner'}
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function visibleFallbackError(error: unknown) {
  if (error instanceof Error && /401|403|unauthorized|forbidden/i.test(error.message)) {
    return '';
  }

  return error instanceof Error ? error.message : 'Could not load partner profiles.';
}
