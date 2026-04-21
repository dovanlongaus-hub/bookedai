import { useEffect, useMemo, useState } from 'react';

import { fallbackPartners, type PartnersSectionContent } from '../data';
import { getApiBaseUrl, shouldUseLocalStaticPublicData } from '../../../shared/config/api';
import { SectionCard } from '../ui/SectionCard';
import { SectionHeading } from '../ui/SectionHeading';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

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
  onStartTrial?: () => void;
  onBookDemo?: () => void;
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

export function PartnersSection({
  content,
  onStartTrial,
  onBookDemo,
}: PartnersSectionProps) {
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
    `${visibleItems.length || fallbackPartners.length} visible logos in the proof layer`,
    'Startup infrastructure plus real ecosystem presence',
    'Partner proof supports credibility without becoming the headline',
  ];
  const trustMetrics = [
    {
      label: 'Infrastructure',
      value: `${infrastructurePartners.length || 0}`,
      detail: 'platform and startup-support logos',
    },
    {
      label: 'Ecosystem',
      value: `${ecosystemPartners.length || 0}`,
      detail: 'customer and network visibility',
    },
    {
      label: 'Trust role',
      value: 'Support',
      detail: 'backs the pitch without stealing focus',
    },
  ];

  return (
    <SectionShell id="partners" className="py-24">
      <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <SectionCard className="p-7 lg:p-8">
          <SectionHeading
            kicker={content.kicker}
            kickerClassName={content.kickerClassName}
            title={content.title}
            body={content.body}
            actions={
              onStartTrial || onBookDemo ? (
                <div className="flex flex-wrap gap-3">
                  {onStartTrial ? (
                    <button type="button" onClick={onStartTrial} className="booked-button">
                      Open Product Trial
                    </button>
                  ) : null}
                  {onBookDemo ? (
                    <button type="button" onClick={onBookDemo} className="booked-button-secondary">
                      Talk to Sales
                    </button>
                  ) : null}
                </div>
              ) : null
            }
          />

          <div className="mt-7 grid gap-3">
            {content.stats.map((item) => (
              <SectionCard
                key={item}
                tone="subtle"
                className="rounded-[1.2rem] px-4 py-3 text-sm font-medium text-slate-700"
              >
                {item}
              </SectionCard>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {trustMetrics.map((item) => (
              <SectionCard key={item.label} tone="subtle" className="rounded-[1.25rem] px-4 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {item.label}
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">{item.value}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</div>
              </SectionCard>
            ))}
          </div>

          <SectionCard tone="dark" className="mt-5 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7dd3fc]">
              Trust frame
            </div>
            <div className="mt-3 grid gap-3">
              {trustSignals.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.15rem] border border-white/10 bg-white/8 px-4 py-3 text-sm font-medium leading-6 text-white/82"
                >
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        </SectionCard>

        <SectionCard className="rounded-[1.9rem] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Partner trust
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-950">
                Credibility support, kept in the background where it belongs
              </div>
            </div>
            <SignalPill className="border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              {visibleItems.length} partners
            </SignalPill>
          </div>

          {loading ? (
            <SectionCard tone="subtle" className="mt-6 rounded-[1.4rem] px-5 py-8 text-sm text-slate-500">
              Loading partner profiles...
            </SectionCard>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
              {error}
            </div>
          ) : null}

          {!loading && visibleItems.length > 0 ? (
            <div className="mt-6 space-y-5">
              <SectionCard as="section" tone="subtle" className="rounded-[1.5rem] border border-sky-100 bg-sky-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      Infrastructure support
                    </div>
                    <div className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                      Startup programs and core platforms that help the product feel legitimate
                    </div>
                  </div>
                  <SignalPill className="bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 ring-1 ring-sky-100">
                    {infrastructurePartners.length} logos
                  </SignalPill>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {infrastructurePartners.map((item) => (
                    <a
                      key={item.id}
                      href={item.website_url ?? '#partners'}
                      target={item.website_url ? '_blank' : undefined}
                      rel={item.website_url ? 'noreferrer' : undefined}
                      className="min-h-[13rem] overflow-hidden rounded-[1.2rem] border border-sky-100 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(15,23,42,0.05)]"
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
                          <div className="mt-2 flex flex-wrap gap-2">
                            <SignalPill className="bg-sky-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-sky-700">
                              {item.category ?? 'Infrastructure'}
                            </SignalPill>
                            <SignalPill className="bg-slate-100 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-600">
                              Startup support
                            </SignalPill>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </SectionCard>

              <SectionCard as="section" className="rounded-[1.5rem] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Ecosystem and client visibility
                    </div>
                    <div className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                      Customer and ecosystem logos that add confidence without crowding the close
                    </div>
                  </div>
                  <SignalPill className="bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    Responsive grid
                  </SignalPill>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {ecosystemPartners.map((item) => (
                    <a
                      key={item.id}
                      href={item.website_url ?? '#partners'}
                      target={item.website_url ? '_blank' : undefined}
                      rel={item.website_url ? 'noreferrer' : undefined}
                      className="min-h-[13rem] overflow-hidden rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(15,23,42,0.05)]"
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
                          <div className="mt-2 flex flex-wrap gap-2">
                            <SignalPill className="bg-emerald-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-700">
                              {item.category ?? 'Partner'}
                            </SignalPill>
                            <SignalPill className="bg-slate-100 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-600">
                              Visible ecosystem
                            </SignalPill>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </SectionCard>

              <SectionCard as="section" tone="subtle" className="rounded-[1.5rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Logo wall
                    </div>
                    <div className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                      A lighter scan line of customer, ecosystem, and infrastructure proof
                    </div>
                  </div>
                  <SignalPill className="bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
                    At-a-glance proof
                  </SignalPill>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                  {visibleItems.slice(0, 12).map((item) => (
                    <div
                      key={`logo-strip-${item.id}`}
                      className="flex min-h-[5.5rem] items-center justify-center rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]"
                    >
                      <img
                        src={item.logo_url ?? item.image_url ?? ''}
                        alt={`${item.name} logo`}
                        className="max-h-8 w-auto max-w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : null}
        </SectionCard>
      </div>
    </SectionShell>
  );
}

function visibleFallbackError(error: unknown) {
  if (error instanceof Error && /401|403|unauthorized|forbidden/i.test(error.message)) {
    return '';
  }

  return error instanceof Error ? error.message : 'Could not load partner profiles.';
}
