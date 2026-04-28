import { useId, useState } from 'react';
import type { CitationCandidate } from './citationParser';

/**
 * <CitationChip /> — Lane 7 P5 (review-2026-04-28).
 *
 * Inline numbered pill rendered next to claims inside an AI assistant reply
 * — the "show your work" trust pattern from Perplexity / Glean.
 *
 * Visual: small `[1]` pill, paper-blue tint, tabular nums for stable width.
 * Behaviour:
 *   - Hover/focus exposes a small tooltip (service + provider + source).
 *   - Click invokes `onClick(candidate)` so the host scrolls to the matching
 *     result card and pulses it (see `citation-pulsing` keyframe in
 *     `frontend/src/styles.css`).
 *   - Keyboard accessible via native <button>; `aria-label` describes the
 *     citation in full ("Citation 1: <service> from <provider>").
 *
 * Touch target:
 *   The chip itself is intentionally compact (24×20) so it sits inline next
 *   to text. The clickable wrapper area is padded to keep the tap surface
 *   ≥ 24×24 with an extra 4px hit-area on every side via padding/margin
 *   negative offsets, satisfying the mobile-first ergonomics constraint
 *   without bloating reply line-height.
 *
 * Tokens — ZERO arbitrary hex:
 *   bg-apple-paper-blue-100 / text-apple-blue / ring-apple-paper-blue-200
 */

export type CitationChipProps = {
  index: number;
  candidate: CitationCandidate;
  onClick: (candidate: CitationCandidate) => void;
  className?: string;
};

export function CitationChip({ index, candidate, onClick, className }: CitationChipProps) {
  const tooltipId = useId();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const ariaParts = [`Citation ${index}`, candidate.serviceName];
  if (candidate.providerName) ariaParts.push(`from ${candidate.providerName}`);
  if (candidate.sourceLabel) ariaParts.push(`(${candidate.sourceLabel})`);
  const ariaLabel = ariaParts.join(' ');

  const tooltipLine = candidate.providerName
    ? `${candidate.serviceName} · ${candidate.providerName}`
    : candidate.serviceName;

  return (
    <span className={`relative inline-flex align-baseline ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => onClick(candidate)}
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onFocus={() => setTooltipOpen(true)}
        onBlur={() => setTooltipOpen(false)}
        aria-label={ariaLabel}
        aria-describedby={tooltipOpen ? tooltipId : undefined}
        data-citation-chip="true"
        data-citation-index={index}
        data-citation-candidate-id={candidate.candidateId}
        className="mx-0.5 inline-flex h-5 min-w-[24px] items-center justify-center rounded-full bg-apple-paper-blue-100 px-1.5 text-xs font-semibold tabular-nums text-apple-blue ring-1 ring-apple-paper-blue-200 transition hover:bg-apple-paper-blue-200 hover:ring-apple-paper-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue"
      >
        {index}
      </button>
      {tooltipOpen ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-apple-near-black px-2 py-1 text-[11px] font-medium leading-4 text-white shadow-apple-card"
        >
          {tooltipLine}
          {candidate.sourceLabel ? (
            <span className="ml-1 text-white/70">· {candidate.sourceLabel}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export default CitationChip;
