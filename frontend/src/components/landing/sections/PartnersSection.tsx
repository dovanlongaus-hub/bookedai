import { useEffect, useState } from 'react';

import { fallbackPartners, type PartnersSectionContent } from '../data';
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

function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/^['"]|['"]$/g, '');
  if (configuredBaseUrl) {
    try {
      const normalizedBaseUrl = configuredBaseUrl.replace(/\/$/, '');
      const candidate = normalizedBaseUrl.endsWith('/api')
        ? normalizedBaseUrl
        : `${normalizedBaseUrl}/api`;
      return new URL(candidate).toString().replace(/\/$/, '');
    } catch {
      return '/api';
    }
  }

  if (typeof window === 'undefined') {
    return '/api';
  }

  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }

  return '/api';
}

function hasDistinctShowcaseImage(item: PartnerProfileItem) {
  if (!item.image_url) {
    return false;
  }
  if (!item.logo_url) {
    return true;
  }
  return item.image_url.trim() !== item.logo_url.trim();
}

export function PartnersSection({ content }: PartnersSectionProps) {
  const [items, setItems] = useState<PartnerProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPartners() {
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
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load partner profiles.',
          );
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

  const mergedItems = [
    ...fallbackPartners.map<PartnerProfileItem>((partner, index) => ({
      id: -1000 - index,
      name: partner.name,
      category: partner.category,
      website_url: partner.websiteUrl,
      description: partner.description,
      logo_url: partner.logoUrl,
      image_url: partner.imageUrl,
      featured: partner.featured,
      sort_order: -1000 + index,
      is_active: true,
    })),
    ...items,
  ].filter(
    (item, index, array) =>
      array.findIndex(
        (candidate) =>
          candidate.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
      ) === index,
  ).sort((left, right) => left.sort_order - right.sort_order);

  const featuredItems = mergedItems.filter((item) => item.featured);
  const logoItems = mergedItems.filter((item) => item.logo_url);
  const spotlightItems = (featuredItems.length > 0 ? featuredItems : mergedItems).slice(0, 6);

  return (
    <section id="partners" className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <div>
          <SectionHeading
            kicker={content.kicker}
            kickerClassName={content.kickerClassName}
            title={content.title}
            body={content.body}
          />

          <div className="mt-8 grid gap-3">
            {content.stats.map((item) => (
              <div
                key={item}
                className="rounded-[1.35rem] border border-slate-200 bg-white/80 px-5 py-4 text-sm font-medium text-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Trusted by
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-950">
                  Partners and customers on the BookedAI wall
                </div>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                {mergedItems.length} profiles live
              </div>
            </div>

            {loading ? (
              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                Loading partner profiles...
              </div>
            ) : error ? (
              <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
                {error}
              </div>
            ) : logoItems.length > 0 ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {logoItems.map((item) => {
                  const logoImage = (
                    <div className="flex min-h-[112px] items-center justify-center rounded-[1.2rem] bg-white px-5 py-5">
                      <img
                        src={item.logo_url ?? item.image_url ?? ''}
                        alt={`${item.name} logo`}
                        className="max-h-16 w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  );

                  return item.website_url ? (
                    <a
                      key={item.id}
                      href={item.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-white"
                    >
                      {logoImage}
                    </a>
                  ) : (
                    <div
                      key={item.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3"
                    >
                      {logoImage}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                <div className="text-lg font-semibold text-slate-950">{content.emptyTitle}</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{content.emptyBody}</p>
              </div>
            )}
          </div>

          {spotlightItems.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {spotlightItems.map((item) => {
                const useShowcaseImage = hasDistinctShowcaseImage(item);
                return (
                  <article
                    key={item.id}
                    className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
                  >
                    <div className="aspect-[4/2.6] bg-slate-100">
                      {useShowcaseImage ? (
                        <img
                          src={item.image_url || ''}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : item.logo_url || item.image_url ? (
                        <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-8 py-8">
                          <img
                            src={item.logo_url || item.image_url || ''}
                            alt={item.name}
                            className="max-h-24 w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
                          No image uploaded yet
                        </div>
                      )}
                    </div>
                    <div className="flex h-full flex-col p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                        {item.category || 'Partner profile'}
                      </div>
                      <h3 className="mt-3 text-xl font-semibold text-slate-950">{item.name}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        {item.description || 'Profile description coming soon.'}
                      </p>
                      {item.website_url ? (
                        <a
                          href={item.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-auto pt-5 inline-flex text-sm font-semibold text-sky-700 transition hover:text-sky-800"
                        >
                          Visit website
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
