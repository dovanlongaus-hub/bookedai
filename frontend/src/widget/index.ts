/**
 * BookedAI Plugin Embed Widget — Wave 5-E-3.
 *
 * Distributes the BookedAI search/booking flow as a single
 * `<script src="https://cdn.bookedai.au/widget/v1.js" defer></script>` drop-in.
 *
 * Tenants embed:
 *
 *   <bookedai-search tenant="ai-mentor-doer" theme="auto"></bookedai-search>
 *
 * Why a Web Component (not React):
 *   - Zero peer-dep contract with the host page (no React clash).
 *   - Shadow DOM completely isolates host CSS — tenant sites can't override
 *     our buttons or get overridden by their own globals.
 *   - Smaller bundle. We hand-roll DOM the same way the chess/swim widgets
 *     embedded in tenant emails do.
 *
 * Booking flow strategy:
 *   - The widget renders the "search composer + 6 result cards" surface
 *     itself. It does NOT try to embed the full payment/portal flow — that
 *     surface is large, has its own auth, and uses idempotency keys.
 *   - Click "Book" -> we open `https://product.bookedai.au/?embed=widget&tenant={slug}`
 *     in a modal iframe (full-screen on mobile). The product app does the
 *     real booking and `postMessage`s the booking_reference + portal token
 *     back to us when the user finishes. We re-emit those as `bookedai:booking`
 *     CustomEvents on the host element so the tenant page can listen.
 */

import { fetchPartnerConfig, resolveApiBase, searchCandidates } from './api';
import { WIDGET_STYLES } from './styles';
import type {
  BookedAIWidgetEventDetail,
  ThemeMode,
  WidgetAttribute,
  WidgetCandidate,
  WidgetTenantConfig,
} from './types';

const OBSERVED_ATTRIBUTES: WidgetAttribute[] = [
  'tenant',
  'theme',
  'accent',
  'embedded',
  'product-url',
  'api-base',
];

const DEFAULT_PRODUCT_URL = 'https://product.bookedai.au/';
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'auto';
}

function safeAccent(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  return HEX_RE.test(trimmed) ? trimmed : null;
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function brandInitials(name: string): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'BA';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
}

function emit<T extends BookedAIWidgetEventDetail>(host: HTMLElement, type: string, detail: T): void {
  host.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

class BookedAISearchWidget extends HTMLElement {
  static get observedAttributes(): string[] {
    return OBSERVED_ATTRIBUTES;
  }

  private readonly root: ShadowRoot;

  private container: HTMLDivElement | null = null;

  private overlayEl: HTMLDivElement | null = null;

  private mediaListener: ((event: MediaQueryListEvent) => void) | null = null;

  private mediaQuery: MediaQueryList | null = null;

  private messageListener: ((event: MessageEvent) => void) | null = null;

  private config: WidgetTenantConfig | null = null;

  private state: 'idle' | 'loading-config' | 'config-error' | 'ready' | 'searching' | 'search-error' = 'idle';

  private candidates: WidgetCandidate[] = [];

  private lastQuery = '';

  private currentRequestId = 0;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = WIDGET_STYLES;
    this.root.appendChild(style);
    this.container = document.createElement('div');
    this.container.className = 'root';
    this.root.appendChild(this.container);
  }

  connectedCallback(): void {
    this.applyTheme();
    this.applyAccent();
    this.bootstrapConfig();
  }

  disconnectedCallback(): void {
    this.detachMediaListener();
    this.detachMessageListener();
    this.closeOverlay();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null): void {
    if (name === 'theme') {
      this.applyTheme();
    } else if (name === 'accent') {
      this.applyAccent();
    } else if (name === 'tenant' || name === 'api-base') {
      this.bootstrapConfig();
    } else if (name === 'embedded') {
      this.render();
    }
  }

  // ---------- Theme + accent ----------

  private getThemeMode(): ThemeMode {
    const raw = this.getAttribute('theme');
    return isThemeMode(raw) ? raw : 'auto';
  }

  private applyTheme(): void {
    const mode = this.getThemeMode();
    this.detachMediaListener();
    if (mode === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      this.setThemeAttr(mq.matches ? 'dark' : 'light');
      const listener = (event: MediaQueryListEvent) => {
        this.setThemeAttr(event.matches ? 'dark' : 'light');
      };
      // Older Safari: addListener / removeListener
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', listener);
      } else if (typeof (mq as unknown as { addListener?: typeof listener }).addListener === 'function') {
        (mq as unknown as { addListener: (l: typeof listener) => void }).addListener(listener);
      }
      this.mediaQuery = mq;
      this.mediaListener = listener;
    } else {
      this.setThemeAttr(mode);
    }
  }

  private setThemeAttr(value: 'light' | 'dark'): void {
    this.setAttribute('data-theme', value);
  }

  private detachMediaListener(): void {
    if (this.mediaQuery && this.mediaListener) {
      const mq = this.mediaQuery;
      const listener = this.mediaListener;
      if (typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', listener);
      } else if (typeof (mq as unknown as { removeListener?: typeof listener }).removeListener === 'function') {
        (mq as unknown as { removeListener: (l: typeof listener) => void }).removeListener(listener);
      }
    }
    this.mediaQuery = null;
    this.mediaListener = null;
  }

  private applyAccent(): void {
    if (!this.container) return;
    const accentAttr = safeAccent(this.getAttribute('accent'));
    const accentBrand = safeAccent(this.config?.brand.accentColor);
    const accent = accentAttr ?? accentBrand;
    if (accent) {
      this.container.style.setProperty('--bookedai-blue', accent);
    } else {
      this.container.style.removeProperty('--bookedai-blue');
    }
  }

  // ---------- Config ----------

  private getTenantSlug(): string {
    return (this.getAttribute('tenant') ?? '').trim().toLowerCase();
  }

  private getApiBase(): string {
    return resolveApiBase(this.getAttribute('api-base'));
  }

  private getProductUrl(): string {
    const override = (this.getAttribute('product-url') ?? '').trim();
    return override || DEFAULT_PRODUCT_URL;
  }

  private bootstrapConfig(): void {
    const slug = this.getTenantSlug();
    if (!slug) {
      this.state = 'config-error';
      this.config = null;
      this.render();
      return;
    }
    this.state = 'loading-config';
    this.render();
    const requestId = ++this.currentRequestId;
    fetchPartnerConfig(this.getApiBase(), slug)
      .then((config) => {
        if (requestId !== this.currentRequestId) return;
        if (!config || !config.active) {
          this.state = 'config-error';
          this.config = null;
        } else {
          this.config = config;
          this.state = 'ready';
        }
        this.applyAccent();
        this.render();
      })
      .catch(() => {
        if (requestId !== this.currentRequestId) return;
        this.state = 'config-error';
        this.config = null;
        this.render();
      });
  }

  // ---------- Render ----------

  private render(): void {
    const container = this.container;
    if (!container) return;
    if (this.state === 'loading-config') {
      container.innerHTML = this.renderLoading();
      return;
    }
    if (this.state === 'config-error') {
      container.innerHTML = this.renderErrorShell();
      return;
    }
    container.innerHTML = this.renderReady();
    this.bindReadyHandlers();
  }

  private renderLoading(): string {
    return `
      <div class="header">
        <div class="brand-line">
          <div class="brand-fallback skeleton" aria-hidden="true"></div>
          <div class="brand-text" style="gap:6px;display:flex;flex-direction:column;width:60%">
            <div class="skeleton skeleton-line short"></div>
            <div class="skeleton skeleton-line"></div>
          </div>
        </div>
      </div>
      <div class="composer" aria-hidden="true">
        <div class="skeleton" style="height:44px;width:100%"></div>
      </div>
      <div class="results">
        ${[0, 1, 2]
          .map(
            () => `
          <div class="result-card">
            <div class="result-thumb-fallback skeleton"></div>
            <div class="result-body" style="gap:6px">
              <div class="skeleton skeleton-line"></div>
              <div class="skeleton skeleton-line short"></div>
            </div>
          </div>`,
          )
          .join('')}
      </div>
      <span class="error" role="status" aria-live="polite">Loading BookedAI…</span>
    `;
  }

  private renderErrorShell(): string {
    const slug = escapeText(this.getTenantSlug() || 'this partner');
    return `
      <div class="header">
        <div class="brand-line">
          <div class="brand-fallback" aria-hidden="true">BA</div>
          <div class="brand-text">
            <span class="brand-kicker">BookedAI partner</span>
            <span class="brand-name">${slug}</span>
          </div>
        </div>
        <a class="powered-by" href="https://bookedai.au/" target="_blank" rel="noopener">bookedai.au</a>
      </div>
      <p class="error">BookedAI is reaching the operator… please try again in a moment.</p>
    `;
  }

  private renderReady(): string {
    const config = this.config;
    if (!config) {
      return this.renderErrorShell();
    }
    const brand = config.brand;
    const logoBlock = brand.logoUrl
      ? `<img class="brand-logo" src="${escapeText(brand.logoUrl)}" alt="${escapeText(brand.name)} logo" loading="lazy" decoding="async" />`
      : `<div class="brand-fallback" aria-hidden="true">${escapeText(brandInitials(brand.name))}</div>`;
    const kicker = config.hero.kicker
      ? config.hero.kicker
      : `Powered by ${brand.name} via BookedAI`;
    const composerLabel = `Search ${brand.name} on BookedAI`;
    return `
      <div class="header">
        <div class="brand-line">
          ${logoBlock}
          <div class="brand-text">
            <span class="brand-kicker">${escapeText(kicker)}</span>
            <span class="brand-name">${escapeText(brand.name)}</span>
          </div>
        </div>
        <a class="powered-by" href="https://bookedai.au/" target="_blank" rel="noopener">Powered by BookedAI</a>
      </div>
      <form class="composer" data-action="search" role="search" aria-label="${escapeText(composerLabel)}">
        <input
          type="search"
          name="query"
          inputmode="search"
          placeholder="Find a session, mentor or class…"
          aria-label="${escapeText(composerLabel)}"
          autocomplete="off"
        />
        <button class="btn btn-primary" type="submit" aria-label="Search">Search</button>
      </form>
      <div class="results" data-region="results" aria-live="polite">
        ${this.renderResults()}
      </div>
    `;
  }

  private renderResults(): string {
    if (this.state === 'searching') {
      return [0, 1, 2]
        .map(
          () => `
        <div class="result-card">
          <div class="result-thumb-fallback skeleton"></div>
          <div class="result-body" style="gap:6px">
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line short"></div>
          </div>
        </div>`,
        )
        .join('');
    }
    if (this.state === 'search-error') {
      return `<p class="error">We couldn't reach BookedAI just now. Try again in a moment.</p>`;
    }
    if (!this.lastQuery) {
      return `<p class="empty">Type what you need above to see live BookedAI matches.</p>`;
    }
    if (this.candidates.length === 0) {
      return `<p class="empty">No matches yet — try a different keyword.</p>`;
    }
    return this.candidates
      .map((candidate) => {
        const initials = brandInitials(candidate.serviceName || candidate.providerName);
        const thumb = candidate.imageUrl
          ? `<img class="result-thumb" src="${escapeText(candidate.imageUrl)}" alt="" loading="lazy" decoding="async" />`
          : `<div class="result-thumb-fallback" aria-hidden="true">${escapeText(initials)}</div>`;
        const subParts: string[] = [];
        if (candidate.providerName) subParts.push(candidate.providerName);
        if (candidate.summary) subParts.push(candidate.summary);
        const sub = subParts.length > 0 ? `<p class="result-sub">${escapeText(subParts.join(' · '))}</p>` : '';
        const price = candidate.displayPrice
          ? `<p class="result-price">${escapeText(candidate.displayPrice)}</p>`
          : '';
        const chips = candidate.tags.length > 0
          ? `<div class="chips">${candidate.tags
              .map((tag) => `<span class="chip">${escapeText(tag)}</span>`)
              .join('')}</div>`
          : '';
        return `
          <div class="result-card">
            ${thumb}
            <div class="result-body">
              <h3 class="result-title">${escapeText(candidate.serviceName)}</h3>
              ${sub}
              ${price}
              ${chips}
            </div>
            <button
              class="btn btn-primary result-cta"
              type="button"
              data-action="book"
              data-candidate-id="${escapeText(candidate.candidateId)}"
            >Book</button>
          </div>
        `;
      })
      .join('');
  }

  private bindReadyHandlers(): void {
    const container = this.container;
    if (!container) return;
    const form = container.querySelector('form[data-action="search"]') as HTMLFormElement | null;
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = form.querySelector('input[name="query"]') as HTMLInputElement | null;
        const query = (input?.value ?? '').trim();
        if (!query) return;
        this.runSearch(query);
      });
    }
    const bookButtons = container.querySelectorAll('button[data-action="book"]');
    bookButtons.forEach((node) => {
      node.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const candidateId = target.getAttribute('data-candidate-id') ?? '';
        this.openBookingOverlay(candidateId);
      });
    });
  }

  // ---------- Search ----------

  private runSearch(query: string): void {
    const config = this.config;
    if (!config) return;
    this.lastQuery = query;
    this.state = 'searching';
    this.renderResultsRegion();
    const requestId = ++this.currentRequestId;
    searchCandidates(this.getApiBase(), config.slug, query)
      .then((candidates) => {
        if (requestId !== this.currentRequestId) return;
        this.candidates = candidates;
        this.state = 'ready';
        this.renderResultsRegion();
        this.bindBookHandlers();
      })
      .catch(() => {
        if (requestId !== this.currentRequestId) return;
        this.candidates = [];
        this.state = 'search-error';
        this.renderResultsRegion();
      });
  }

  private renderResultsRegion(): void {
    const container = this.container;
    if (!container) return;
    const region = container.querySelector('[data-region="results"]') as HTMLDivElement | null;
    if (region) {
      region.innerHTML = this.renderResults();
    }
  }

  private bindBookHandlers(): void {
    const container = this.container;
    if (!container) return;
    container.querySelectorAll('button[data-action="book"]').forEach((node) => {
      node.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const candidateId = target.getAttribute('data-candidate-id') ?? '';
        this.openBookingOverlay(candidateId);
      });
    });
  }

  // ---------- Booking overlay (iframe) ----------

  private openBookingOverlay(candidateId: string): void {
    const slug = this.getTenantSlug();
    if (!slug) return;
    this.closeOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Complete your booking with BookedAI');

    const frameWrap = document.createElement('div');
    frameWrap.className = 'overlay-frame';

    const iframe = document.createElement('iframe');
    const params = new URLSearchParams();
    params.set('embed', 'widget');
    params.set('tenant', slug);
    if (candidateId) params.set('candidate', candidateId);
    if (this.lastQuery) params.set('q', this.lastQuery);
    const productUrl = this.getProductUrl().replace(/\/$/, '');
    iframe.src = `${productUrl}/?${params.toString()}`;
    iframe.title = 'BookedAI booking flow';
    iframe.setAttribute('allow', 'payment; clipboard-write');
    iframe.setAttribute('loading', 'eager');
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'overlay-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close booking');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.closeOverlay());

    frameWrap.appendChild(iframe);
    frameWrap.appendChild(closeBtn);
    overlay.appendChild(frameWrap);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) this.closeOverlay();
    });

    this.root.appendChild(overlay);
    this.overlayEl = overlay;
    this.attachMessageListener();

    emit<BookedAIWidgetEventDetail>(this, 'bookedai:open', {
      tenant: slug,
      candidateId: candidateId || undefined,
    });
  }

  private closeOverlay(): void {
    if (this.overlayEl && this.overlayEl.parentNode) {
      this.overlayEl.parentNode.removeChild(this.overlayEl);
    }
    this.overlayEl = null;
    this.detachMessageListener();
  }

  private attachMessageListener(): void {
    this.detachMessageListener();
    const slug = this.getTenantSlug();
    const productOrigin = (() => {
      try {
        return new URL(this.getProductUrl()).origin;
      } catch {
        return '';
      }
    })();
    const listener = (event: MessageEvent) => {
      if (productOrigin && event.origin !== productOrigin) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      const message = data as Record<string, unknown>;
      const messageType = typeof message.type === 'string' ? message.type : '';
      if (!messageType.startsWith('bookedai:')) return;
      if (messageType === 'bookedai:close') {
        this.closeOverlay();
        return;
      }
      if (messageType === 'bookedai:booking') {
        const bookingReference = typeof message.bookingReference === 'string'
          ? message.bookingReference
          : typeof message.booking_reference === 'string'
            ? (message.booking_reference as string)
            : undefined;
        const portalToken = typeof message.portalToken === 'string'
          ? message.portalToken
          : typeof message.portal_token === 'string'
            ? (message.portal_token as string)
            : undefined;
        emit<BookedAIWidgetEventDetail>(this, 'bookedai:booking', {
          tenant: slug,
          bookingReference,
          portalToken,
        });
        this.closeOverlay();
      }
    };
    window.addEventListener('message', listener);
    this.messageListener = listener;
  }

  private detachMessageListener(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
    }
    this.messageListener = null;
  }
}

function register(): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get('bookedai-search')) return;
  customElements.define('bookedai-search', BookedAISearchWidget);
}

register();

export { BookedAISearchWidget };
