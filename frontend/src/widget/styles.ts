/**
 * Inline Shadow DOM styles for `<bookedai-search>`.
 *
 * Mirrors the Apple design system tokens defined in
 * `frontend/public/minimal-bento-template.css` but is intentionally a tiny
 * subset — the widget bundle target is < 50KB gzipped, so we cannot pull in
 * the full theme. Every literal here is either:
 *
 *   - one of the 5 BookedAI tokens listed in the spec, or
 *   - a CSS-system value (e.g. `system-ui`, `transparent`, `inherit`).
 *
 * No arbitrary hex outside the token set.
 */

export const WIDGET_STYLES = `
:host {
  --bookedai-blue: #0071e3;
  --bookedai-light: #f5f5f7;
  --bookedai-near-black: #1d1d1f;
  --bookedai-radius-card: 12px;
  --bookedai-radius-button: 8px;
  --bookedai-bg: var(--bookedai-light);
  --bookedai-fg: var(--bookedai-near-black);
  --bookedai-muted-fg: rgba(29, 29, 31, 0.66);
  --bookedai-card-bg: #ffffff;
  --bookedai-border: rgba(29, 29, 31, 0.12);
  --bookedai-shadow: 0 1px 2px rgba(29, 29, 31, 0.06), 0 4px 16px rgba(29, 29, 31, 0.06);
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--bookedai-fg);
  box-sizing: border-box;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}

:host([embedded]) {
  max-width: 100%;
}

:host([data-theme="dark"]) {
  --bookedai-bg: var(--bookedai-near-black);
  --bookedai-fg: var(--bookedai-light);
  --bookedai-muted-fg: rgba(245, 245, 247, 0.7);
  --bookedai-card-bg: rgba(245, 245, 247, 0.06);
  --bookedai-border: rgba(245, 245, 247, 0.16);
  --bookedai-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.32);
}

* { box-sizing: border-box; }

.root {
  background: var(--bookedai-bg);
  color: var(--bookedai-fg);
  border-radius: var(--bookedai-radius-card);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--bookedai-shadow);
  border: 1px solid var(--bookedai-border);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.brand-line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.brand-logo {
  width: 36px;
  height: 36px;
  border-radius: var(--bookedai-radius-button);
  object-fit: contain;
  background: var(--bookedai-card-bg);
  border: 1px solid var(--bookedai-border);
  flex: 0 0 auto;
}

.brand-fallback {
  width: 36px;
  height: 36px;
  border-radius: var(--bookedai-radius-button);
  background: var(--bookedai-card-bg);
  border: 1px solid var(--bookedai-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  color: var(--bookedai-blue);
  flex: 0 0 auto;
  letter-spacing: -0.01em;
}

.brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-name {
  font-weight: 600;
  font-size: 15px;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-kicker {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--bookedai-muted-fg);
}

.powered-by {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--bookedai-muted-fg);
  text-decoration: none;
  white-space: nowrap;
  flex: 0 0 auto;
}

.powered-by:hover, .powered-by:focus { color: var(--bookedai-blue); outline: none; }

.composer {
  display: flex;
  gap: 8px;
  align-items: stretch;
  background: var(--bookedai-card-bg);
  border-radius: var(--bookedai-radius-button);
  padding: 6px;
  border: 1px solid var(--bookedai-border);
}

.composer input {
  flex: 1 1 auto;
  min-width: 0;
  font: inherit;
  font-size: 15px;
  border: 0;
  background: transparent;
  color: var(--bookedai-fg);
  padding: 10px 10px;
  outline: none;
}

.composer input::placeholder { color: var(--bookedai-muted-fg); }

.btn {
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  border: 0;
  border-radius: var(--bookedai-radius-button);
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  padding: 0 14px;
  transition: filter 0.12s ease, transform 0.12s ease;
}

.btn-primary {
  background: var(--bookedai-blue);
  color: #ffffff;
}

.btn-primary:hover { filter: brightness(1.05); }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.6; cursor: progress; }

.btn-secondary {
  background: var(--bookedai-card-bg);
  color: var(--bookedai-fg);
  border: 1px solid var(--bookedai-border);
}

.results {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--bookedai-card-bg);
  border: 1px solid var(--bookedai-border);
  border-radius: var(--bookedai-radius-card);
  align-items: flex-start;
}

.result-thumb {
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  border-radius: var(--bookedai-radius-button);
  object-fit: cover;
  background: var(--bookedai-bg);
}

.result-thumb-fallback {
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  border-radius: var(--bookedai-radius-button);
  background: var(--bookedai-bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--bookedai-blue);
  font-weight: 600;
  font-size: 18px;
  letter-spacing: -0.02em;
}

.result-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1 1 auto; }

.result-title {
  font-weight: 600;
  font-size: 14px;
  letter-spacing: -0.01em;
  margin: 0;
}

.result-sub {
  font-size: 12px;
  color: var(--bookedai-muted-fg);
  margin: 0;
}

.result-price {
  font-size: 13px;
  font-weight: 600;
  color: var(--bookedai-blue);
  margin: 2px 0 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.chip {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--bookedai-bg);
  color: var(--bookedai-muted-fg);
  border: 1px solid var(--bookedai-border);
}

.result-cta {
  flex: 0 0 auto;
  align-self: center;
}

.skeleton {
  background: linear-gradient(90deg, var(--bookedai-card-bg) 0%, var(--bookedai-bg) 50%, var(--bookedai-card-bg) 100%);
  background-size: 200% 100%;
  animation: bookedai-skeleton 1.4s ease-in-out infinite;
  border-radius: var(--bookedai-radius-button);
}

@keyframes bookedai-skeleton {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-line { height: 12px; width: 100%; }
.skeleton-line.short { width: 60%; }

.error {
  font-size: 13px;
  color: var(--bookedai-muted-fg);
  text-align: center;
  padding: 12px;
}

.empty {
  font-size: 13px;
  color: var(--bookedai-muted-fg);
  text-align: center;
  padding: 12px;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(29, 29, 31, 0.66);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483646;
  padding: 24px;
}

.overlay-frame {
  position: relative;
  width: 100%;
  max-width: 720px;
  height: 80vh;
  background: var(--bookedai-card-bg);
  border-radius: var(--bookedai-radius-card);
  overflow: hidden;
  box-shadow: var(--bookedai-shadow);
}

.overlay-frame iframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

.overlay-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--bookedai-card-bg);
  color: var(--bookedai-fg);
  border: 1px solid var(--bookedai-border);
  border-radius: 999px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 640px) {
  .overlay { padding: 0; }
  .overlay-frame {
    width: 100%;
    height: 100%;
    max-width: none;
    border-radius: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
  .btn { transition: none; }
}
`;
