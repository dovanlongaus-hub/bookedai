import assert from 'node:assert/strict';
import test from 'node:test';

// Minimal browser shim that satisfies the small surface
// `portal-token-store.ts` interacts with: sessionStorage + window.history +
// window.location. The shim is reset between tests so they stay isolated.
type StorageShim = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type LocationShim = {
  href: string;
  pathname: string;
  search: string;
  hash: string;
};

type WindowShim = {
  sessionStorage: StorageShim;
  location: LocationShim;
  history: {
    state: unknown;
    replaceState(state: unknown, _title: string, nextUrl: string): void;
  };
};

function createSessionStorage(): StorageShim {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function installBrowserShim(href: string): WindowShim {
  const session = createSessionStorage();
  const url = new URL(href);
  const location: LocationShim = {
    get href() {
      return url.toString();
    },
    set href(_value: string) {
      /* noop — only history.replaceState mutates the URL in tests */
    },
    get pathname() {
      return url.pathname;
    },
    set pathname(_value: string) {
      /* noop */
    },
    get search() {
      return url.search;
    },
    set search(_value: string) {
      /* noop */
    },
    get hash() {
      return url.hash;
    },
    set hash(_value: string) {
      /* noop */
    },
  };
  const win: WindowShim = {
    sessionStorage: session,
    location,
    history: {
      state: null,
      replaceState(state, _title, nextUrl) {
        this.state = state;
        const resolved = new URL(nextUrl, url.toString());
        url.pathname = resolved.pathname;
        url.search = resolved.search;
        url.hash = resolved.hash;
      },
    },
  };
  (globalThis as unknown as { window: WindowShim }).window = win;
  return win;
}

function uninstallBrowserShim() {
  delete (globalThis as unknown as { window?: WindowShim }).window;
}

// Importing this once also fires the module-load bootstrap against whatever
// `window` shim is installed at the time of the FIRST import. Subsequent
// tests call `bootstrapPortalAccessTokenFromUrl()` explicitly to re-run the
// extraction + URL scrub against a freshly-installed shim.
installBrowserShim('https://portal.bookedai.au/?ref=BAI-DEMO-INIT&token=initial-bootstrap');
const tokenStore = await import('./portal-token-store');
uninstallBrowserShim();

test('extractTokenFromCurrentUrl reads ref + token query params', () => {
  installBrowserShim('https://portal.bookedai.au/?ref=BAI-DEMO-001&token=test-token-abc');
  try {
    const extracted = tokenStore.extractTokenFromCurrentUrl();
    assert.equal(extracted.booking_reference, 'BAI-DEMO-001');
    assert.equal(extracted.token, 'test-token-abc');
  } finally {
    uninstallBrowserShim();
  }
});

test('bootstrap persists the token and scrubs ?token= from the URL', () => {
  const win = installBrowserShim(
    'https://portal.bookedai.au/?ref=BAI-DEMO-001&token=test-token-abc',
  );
  try {
    tokenStore.bootstrapPortalAccessTokenFromUrl();
    assert.equal(
      win.sessionStorage.getItem('bookedai.portal.token.BAI-DEMO-001'),
      'test-token-abc',
    );
    assert.ok(!win.location.search.includes('token='), 'token query param must be stripped');
    assert.ok(
      win.location.search.includes('ref=BAI-DEMO-001'),
      'booking reference query param must be preserved',
    );
  } finally {
    uninstallBrowserShim();
  }
});

test('getPortalAccessToken returns the persisted plaintext for a known booking', () => {
  installBrowserShim('https://portal.bookedai.au/?ref=BAI-DEMO-001&token=test-token-abc');
  try {
    tokenStore.bootstrapPortalAccessTokenFromUrl();
    assert.equal(tokenStore.getPortalAccessToken('BAI-DEMO-001'), 'test-token-abc');
    assert.equal(tokenStore.getPortalAccessToken('UNKNOWN-REF'), null);
  } finally {
    uninstallBrowserShim();
  }
});

test('clearPortalAccessToken removes both the token and expiry entries', () => {
  const win = installBrowserShim('https://portal.bookedai.au/?ref=BAI-DEMO-001');
  try {
    tokenStore.setPortalAccessToken(
      'BAI-DEMO-001',
      'plain-text-token',
      '2099-01-01T00:00:00Z',
    );
    assert.equal(
      win.sessionStorage.getItem('bookedai.portal.token.BAI-DEMO-001'),
      'plain-text-token',
    );
    assert.equal(
      win.sessionStorage.getItem('bookedai.portal.token.BAI-DEMO-001.expires'),
      '2099-01-01T00:00:00Z',
    );
    tokenStore.clearPortalAccessToken('BAI-DEMO-001');
    assert.equal(win.sessionStorage.getItem('bookedai.portal.token.BAI-DEMO-001'), null);
    assert.equal(
      win.sessionStorage.getItem('bookedai.portal.token.BAI-DEMO-001.expires'),
      null,
    );
  } finally {
    uninstallBrowserShim();
  }
});

test('isPortalTokenExpired returns true past the persisted expiry', () => {
  installBrowserShim('https://portal.bookedai.au/?ref=BAI-DEMO-001');
  try {
    tokenStore.setPortalAccessToken('BAI-DEMO-001', 'plain', '1999-01-01T00:00:00Z');
    assert.equal(tokenStore.isPortalTokenExpired('BAI-DEMO-001'), true);
    assert.equal(tokenStore.getPortalAccessToken('BAI-DEMO-001'), null);
  } finally {
    uninstallBrowserShim();
  }
});
