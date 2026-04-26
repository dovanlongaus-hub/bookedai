#!/usr/bin/env node
/*
 * Portal auto-login smoke
 *
 * Hits `https://portal.bookedai.au/?booking_reference={ref}` (or a configured
 * portal base) and asserts that the URL responds, the booking reference
 * survives into the rendered DOM, and there are no fatal browser console
 * errors. Records evidence under `frontend/output/playwright/portal-auto-login-<ref>-<date>/`.
 *
 * Usage:
 *   node scripts/run_portal_auto_login_smoke.mjs --ref BR-XXX
 *   node scripts/run_portal_auto_login_smoke.mjs --ref BR-XXX --base https://portal.bookedai.au
 *
 * Exit codes:
 *   0  OK
 *   1  page failed to load or reference not visible
 *   2  console error detected during load
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function parseArgs(argv) {
  const args = { ref: '', base: 'https://portal.bookedai.au' };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--ref' && value) {
      args.ref = value;
      i += 1;
    } else if (key === '--base' && value) {
      args.base = value.replace(/\/$/, '');
      i += 1;
    }
  }
  return args;
}

const { ref, base } = parseArgs(process.argv);
if (!ref) {
  console.error('error: --ref <booking_reference> is required');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const evidenceDir = join('output', 'playwright', `portal-auto-login-${ref}-${today}`);
mkdirSync(evidenceDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  ignoreHTTPSErrors: true,
});
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') {
    consoleErrors.push(message.text());
  }
});
page.on('pageerror', (error) => {
  consoleErrors.push(`pageerror: ${error.message}`);
});

const targetUrl = `${base}/?booking_reference=${encodeURIComponent(ref)}`;
console.log(`[portal-auto-login] visiting ${targetUrl}`);

let httpStatus = 0;
let referenceVisible = false;
let bookingLoaded = false;
let errorStateVisible = false;
let fatal = '';

try {
  const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  httpStatus = response?.status() ?? 0;
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const bodyText = (await page.locator('body').innerText()).slice(0, 20000);
  referenceVisible = bodyText.includes(ref);
  errorStateVisible = /BOOKING NOT AVAILABLE|Failed to fetch|We could not load/i.test(bodyText);
  bookingLoaded =
    referenceVisible &&
    !errorStateVisible &&
    /BOOKING TRUTH|PAYMENT POSTURE|PORTAL ACTIONS/i.test(bodyText) &&
    /REQUEST RESCHEDULE|REQUEST CANCELLATION|CONTACT SUPPORT|COMPLETE PAYMENT/i.test(bodyText);
  await page.screenshot({ path: join(evidenceDir, 'portal-loaded.png'), fullPage: true });
  writeFileSync(join(evidenceDir, 'page-text.txt'), bodyText, 'utf8');
} catch (error) {
  fatal = `navigation error: ${error?.message ?? String(error)}`;
}

await browser.close();

const summary = {
  target_url: targetUrl,
  booking_reference: ref,
  http_status: httpStatus,
  reference_visible_in_dom: referenceVisible,
  booking_loaded: bookingLoaded,
  error_state_visible: errorStateVisible,
  console_errors: consoleErrors,
  fatal,
  evidence_dir: evidenceDir,
  timestamp: new Date().toISOString(),
};
writeFileSync(join(evidenceDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

console.log(`[portal-auto-login] http_status=${httpStatus} reference_visible=${referenceVisible} booking_loaded=${bookingLoaded} error_state=${errorStateVisible} console_errors=${consoleErrors.length}`);
console.log(`[portal-auto-login] evidence -> ${evidenceDir}`);

if (fatal) {
  console.error(`[portal-auto-login] FATAL: ${fatal}`);
  process.exit(1);
}
if (httpStatus < 200 || httpStatus >= 400) {
  console.error(`[portal-auto-login] FAIL: bad status ${httpStatus}`);
  process.exit(1);
}
if (!referenceVisible) {
  console.error('[portal-auto-login] FAIL: booking reference not visible in DOM (auto-login may not be wired through to a session-bound view)');
  process.exit(1);
}
if (!bookingLoaded) {
  console.error('[portal-auto-login] FAIL: booking reference is visible, but the portal did not render the booking workspace');
  process.exit(1);
}
if (consoleErrors.length > 0) {
  console.error('[portal-auto-login] FAIL: console errors detected during load');
  process.exit(2);
}
console.log('[portal-auto-login] OK');
process.exit(0);
