import { FormEvent, useEffect, useRef, useState } from 'react';
import { LogOut, Mail, UserRound } from 'lucide-react';

import {
  brandDomainLabel,
  brandHomeUrl,
  brandName,
  brandUploadedLogoPath,
  bookingAssistantContent,
} from '../../components/landing/data';
import {
  buildPublicCtaAttribution,
  dispatchPublicCtaAttribution,
} from '../../components/landing/attribution';
import { BookingAssistantDialog } from '../../components/landing/assistant/BookingAssistantDialog';
import { LogoMark } from '../../components/landing/ui/LogoMark';
import {
  isPublicBookingAssistantV1Enabled,
  isPublicBookingAssistantV1LiveReadEnabled,
} from '../../shared/config/publicBookingAssistant';
import {
  BOOKEDAI_PUBLIC_TENANT_REF,
  createPublicAssistantRuntimeConfig,
} from '../../shared/runtime/publicAssistantRuntime';

const PRODUCT_CUSTOMER_PROFILE_STORAGE_KEY = 'bookedai.product.customerProfile.v1';
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

type ProductCustomerProfile = {
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  authProvider: 'google' | 'email';
};

type GoogleCredentialResponse = { credential?: string };

type GoogleAccountsId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      shape?: 'pill' | 'rectangular' | 'circle' | 'square';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      width?: number;
    },
  ) => void;
};

type GoogleWindow = Window & {
  google?: { accounts?: { id?: GoogleAccountsId } };
};

function readStoredCustomerProfile(): ProductCustomerProfile | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(PRODUCT_CUSTOMER_PROFILE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ProductCustomerProfile>;
    const email = typeof parsed.email === 'string' ? parsed.email.trim().toLowerCase() : '';
    if (!email) {
      return null;
    }
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : email,
      email,
      phone: typeof parsed.phone === 'string' && parsed.phone.trim() ? parsed.phone.trim() : null,
      avatarUrl: typeof parsed.avatarUrl === 'string' && parsed.avatarUrl.trim() ? parsed.avatarUrl.trim() : null,
      authProvider: parsed.authProvider === 'google' ? 'google' : 'email',
    };
  } catch {
    return null;
  }
}

function storeCustomerProfile(profile: ProductCustomerProfile | null) {
  if (typeof window === 'undefined') {
    return;
  }
  if (!profile) {
    window.localStorage.removeItem(PRODUCT_CUSTOMER_PROFILE_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(PRODUCT_CUSTOMER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function decodeGoogleCredential(credential: string): ProductCustomerProfile | null {
  try {
    const [, payloadSegment] = credential.split('.');
    if (!payloadSegment) {
      return null;
    }
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
    const payload = JSON.parse(window.atob(padded)) as {
      email?: string;
      name?: string;
      picture?: string;
    };
    const email = payload.email?.trim().toLowerCase();
    if (!email) {
      return null;
    }
    return {
      name: payload.name?.trim() || email,
      email,
      phone: null,
      avatarUrl: payload.picture?.trim() || null,
      authProvider: 'google',
    };
  } catch {
    return null;
  }
}

function readGoogleAccountsId(): GoogleAccountsId | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return (window as GoogleWindow).google?.accounts?.id;
}

export function ProductApp() {
  const bookingAssistantV1Enabled = isPublicBookingAssistantV1Enabled();
  const bookingAssistantV1LiveReadEnabled = isPublicBookingAssistantV1LiveReadEnabled();
  const [customerProfile, setCustomerProfileState] = useState<ProductCustomerProfile | null>(() =>
    readStoredCustomerProfile(),
  );
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [emailSignInName, setEmailSignInName] = useState('');
  const [emailSignInEmail, setEmailSignInEmail] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = useRef(false);
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
  const productFlowLabel = !bookingAssistantV1Enabled
    ? 'Search preview'
    : bookingAssistantV1LiveReadEnabled
      ? 'Live booking flow'
      : 'Booking flow active';
  const productFlowDescription = !bookingAssistantV1Enabled
    ? 'Chat, search, preview, booking, pay, and care stay connected.'
    : bookingAssistantV1LiveReadEnabled
      ? 'Chat, search, preview, booking, pay, and care stay connected.'
      : 'Chat, search, preview, booking, and follow-up are active.';
  const productFlowSteps = ['Chat', 'Search', 'Preview', 'Book', 'Pay', 'Care'];
  const productRuntimeConfig = createPublicAssistantRuntimeConfig({
    channel: 'public_web',
    tenantRef: BOOKEDAI_PUBLIC_TENANT_REF,
    deploymentMode: 'standalone_app',
    widgetId: 'bookedai-product-live-flow',
    source: 'bookedai_product',
    medium: 'bookedai_owned_website',
    campaign: 'bookedai_product_live_flow',
    surface: 'bookedai_product_assistant',
  });

  function setCustomerProfile(profile: ProductCustomerProfile | null) {
    setCustomerProfileState(profile);
    storeCustomerProfile(profile);
  }

  useEffect(() => {
    if (!googleClientId || customerProfile) {
      return;
    }
    if (readGoogleAccountsId()) {
      setGoogleReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => setGoogleReady(true), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.head.appendChild(script);
  }, [customerProfile, googleClientId]);

  useEffect(() => {
    if (!accountMenuOpen || customerProfile || !googleReady || !googleClientId) {
      return;
    }
    const accountsId = readGoogleAccountsId();
    if (!accountsId || !googleButtonRef.current) {
      return;
    }
    const container = googleButtonRef.current;
    container.innerHTML = '';
    if (!googleInitializedRef.current) {
      accountsId.initialize({
        client_id: googleClientId,
        ux_mode: 'popup',
        callback: (response) => {
          const profile = response.credential ? decodeGoogleCredential(response.credential) : null;
          if (profile) {
            setCustomerProfile(profile);
            setAccountMenuOpen(false);
          }
        },
      });
      googleInitializedRef.current = true;
    }
    accountsId.renderButton(container, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 232,
    });
  }, [accountMenuOpen, customerProfile, googleClientId, googleReady]);

  function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = emailSignInEmail.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return;
    }
    const profile = {
      name: emailSignInName.trim() || email,
      email,
      phone: customerProfile?.phone ?? null,
      avatarUrl: null,
      authProvider: 'email' as const,
    };
    setCustomerProfile(profile);
    setAccountMenuOpen(false);
  }

  function openRegisterInterest() {
    if (typeof window === 'undefined') {
      return;
    }

    const attribution = buildPublicCtaAttribution({
      source_section: 'booking_assistant',
      source_cta: 'start_free_trial',
      source_detail: 'product_page_trial',
      source_flow_mode: 'guided',
    });
    const target = new URL('/register-interest', brandHomeUrl);
    target.searchParams.set('source_section', attribution.source_section);
    target.searchParams.set('source_cta', attribution.source_cta);
    target.searchParams.set('source_detail', attribution.source_detail ?? 'product_page_trial');
    target.searchParams.set('offer', 'launch10');
    target.searchParams.set('deployment', 'standalone_website');
    target.searchParams.set('setup', 'online');
    dispatchPublicCtaAttribution(attribution);
    window.location.href = `${target.pathname}${target.search}`;
  }

  return (
    <main className="booked-shell min-h-screen min-h-[100svh] overflow-x-hidden md:min-h-[100dvh]">
      <h1 className="sr-only">BookedAI live revenue flow</h1>
      <section className="relative flex min-h-[100svh] flex-col md:min-h-[100dvh]">
        <h2 className="sr-only">Chat, search, preview, book, pay, and follow up</h2>

        {/* Compact, mobile-first top bar — single primary action, thumb-zone safe. */}
        <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.35rem)] sm:px-5 sm:pb-2 sm:pt-[calc(env(safe-area-inset-top)+0.8rem)] lg:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <LogoMark
              src={brandUploadedLogoPath}
              alt={brandName}
              className="h-10 w-[8.5rem] max-w-[calc(100vw-13rem)] shrink-0 object-cover object-center sm:w-[10.75rem]"
            />
            <div className="hidden items-center gap-1.5 md:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                <span aria-hidden="true">✨</span>
                Search → Booking
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 sm:flex sm:px-2.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700">{productFlowLabel}</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((current) => !current)}
                aria-expanded={accountMenuOpen}
                aria-label={customerProfile ? `Signed in as ${customerProfile.email}` : 'Sign in for faster booking'}
                className="inline-flex h-11 min-h-[44px] max-w-[9.5rem] items-center gap-2 rounded-full border border-black/6 bg-white/72 px-2.5 text-[11px] font-semibold text-[var(--apple-near-black)] transition hover:bg-white sm:max-w-[14rem] sm:px-3 sm:text-xs"
              >
                {customerProfile?.avatarUrl ? (
                  <img
                    src={customerProfile.avatarUrl}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed_0%,#9333ea_100%)] text-white shadow-[0_4px_10px_rgba(124,58,237,0.28)]">
                    <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                )}
                <span className="truncate">{customerProfile ? customerProfile.email : 'Sign in'}</span>
              </button>

              {accountMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(20rem,calc(100vw-1.5rem))] rounded-[1.4rem] border border-violet-100 bg-white p-3.5 text-slate-700 shadow-[0_24px_60px_rgba(124,58,237,0.18)]">
                  {customerProfile ? (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">Booking profile</div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">{customerProfile.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{customerProfile.email}</div>
                      <div className="mt-3 rounded-[1rem] border border-violet-100 bg-violet-50 px-3 py-2 text-[11px] leading-4 text-violet-800">
                        Future booking forms will use this name and email unless you edit them.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerProfile(null);
                          setAccountMenuOpen(false);
                        }}
                        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50"
                      >
                        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">Faster booking</div>
                      <div className="mt-1 text-sm font-semibold text-slate-950">Save your name and email once.</div>
                      <div className="mt-2 text-xs leading-5 text-slate-500">
                        BookedAI can prefill future booking requests from this browser.
                      </div>
                      {googleClientId ? (
                        <div className="mt-3 min-h-[44px]" ref={googleButtonRef} aria-label="Google sign-in" />
                      ) : null}
                      <form onSubmit={handleEmailSignIn} className="mt-3 space-y-2">
                        <label className="block text-xs font-semibold text-slate-600">
                          Name
                          <input
                            type="text"
                            autoComplete="name"
                            value={emailSignInName}
                            onChange={(event) => setEmailSignInName(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-violet-100 bg-violet-50/40 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-violet-400 focus:bg-white focus-visible:ring-2 focus-visible:ring-violet-500"
                          />
                        </label>
                        <label className="block text-xs font-semibold text-slate-600">
                          Email
                          <input
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            value={emailSignInEmail}
                            onChange={(event) => setEmailSignInEmail(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-violet-100 bg-violet-50/40 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-violet-400 focus:bg-white focus-visible:ring-2 focus-visible:ring-violet-500"
                          />
                        </label>
                        <button
                          type="submit"
                          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-4 text-xs font-semibold text-white transition hover:bg-violet-700 hover:shadow-[0_8px_22px_rgba(124,58,237,0.32)]"
                        >
                          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                          Continue with email
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/*
              Mobile primary CTA. Label aligned to the canonical CTA glossary
              (`Start a 30-day pilot`, Growth tier intent); the secondary back
              link keeps a 44×44 touch target. The internal `start_free_trial`
              attribution name is preserved for analytics continuity.
            */}
            <button
              type="button"
              onClick={openRegisterInterest}
              aria-label="Start free"
              className="booked-button inline-flex h-11 min-h-[44px] shrink-0 items-center justify-center px-3 text-[11px] font-semibold sm:hidden"
            >
              Start free
            </button>

            <a
              href={brandHomeUrl}
              aria-label="Back to main site"
              className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-black/6 bg-white/72 text-[14px] font-semibold text-[var(--apple-near-black)] transition hover:bg-white sm:hidden"
            >
              ←
            </a>

            <a
              href={brandHomeUrl}
              className="booked-button-secondary hidden shrink-0 text-[11px] font-semibold sm:inline-flex sm:text-sm"
            >
              ← Home
            </a>
            <button
              type="button"
              onClick={openRegisterInterest}
              className="booked-button hidden shrink-0 text-[11px] font-semibold sm:inline-flex sm:text-sm"
            >
              Start a 30-day pilot
            </button>
          </div>
        </div>

        {/* Single compact flow strip. Keep the first screen focused on chat. */}
        <div className="relative z-10 hidden px-3 pb-2 sm:block sm:px-5">
          <div className="mx-auto flex max-w-[56rem] items-center gap-2 rounded-[1.1rem] border border-violet-100 bg-[linear-gradient(135deg,rgba(250,245,255,0.95),rgba(255,255,255,0.85))] px-3 py-1.5 shadow-[0_10px_28px_rgba(124,58,237,0.06)] backdrop-blur-sm sm:justify-between sm:gap-3 sm:px-4 sm:py-2">
            <div className="hidden min-w-0 flex-1 sm:block">
              <div className="truncate text-xs font-semibold text-[var(--apple-near-black)]">
                {productFlowDescription}
              </div>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 sm:flex-none sm:overflow-visible sm:pb-0">
              {productFlowSteps.map((step, stepIndex) => (
                <span
                  key={step}
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-5 sm:px-2.5 sm:py-1 sm:text-xs ${
                    stepIndex === 0
                      ? 'bg-violet-600 text-white shadow-[0_4px_12px_rgba(124,58,237,0.25)]'
                      : 'bg-violet-50 text-violet-700 ring-1 ring-violet-100'
                  }`}
                >
                  {step}
                </span>
              ))}
              <button
                type="button"
                onClick={openRegisterInterest}
                aria-label="Start a 30-day pilot"
                className="booked-button hidden h-9 min-h-9 shrink-0 items-center justify-center px-3 text-[11px] font-semibold sm:inline-flex"
              >
                Start pilot
              </button>
            </div>
          </div>
        </div>

        {/*
          Mobile-friendly assistant surface. The container removes side padding
          on phones so the embedded composer can render edge-to-edge inside the
          thumb-zone, matching big-tech mobile booking surfaces.
        */}
        <div className="relative z-10 flex min-h-0 flex-1 justify-center px-0 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-3 sm:pb-6 lg:px-4">
          <div className="flex w-full max-w-full sm:max-w-[42rem] lg:max-w-[54rem] xl:max-w-[60rem]">
            <BookingAssistantDialog
              content={bookingAssistantContent}
              isOpen
              standalone
              layoutMode="product_app"
              runtimeConfig={productRuntimeConfig}
              customerProfile={customerProfile}
              onCustomerProfileChange={setCustomerProfile}
              closeLabel={brandDomainLabel}
              onClose={() => {
                window.location.href = brandHomeUrl;
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
