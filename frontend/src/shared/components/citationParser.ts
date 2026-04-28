/**
 * Citation parser — Lane 7 P5 (review-2026-04-28).
 *
 * Parses inline citation markers from an AI assistant reply and returns an
 * ordered list of nodes (plain-text segments + numbered citation chips) for
 * inline rendering inside a chat bubble — the "show your work" pattern from
 * Perplexity/Glean.
 *
 * Pattern A (preferred, parseable + backend-controllable + future-proof):
 *
 *   "Try Sun Salutation Studio [ID:cand-svc-001] for evening yoga."
 *
 * The backend (or LLM, instructed via the customer-agent system prompt) emits
 * `[ID:<candidate-id>]` markers immediately after the mention. Each unique
 * candidate id is assigned a 1-based sequential `index` based on first
 * appearance, so the same candidate cited twice still renders the SAME
 * `[1]` chip both times.
 *
 * Fallback (Pattern C — auto-link by literal name match) is documented at
 * the bottom of this file and intentionally NOT shipped in MVP because it is
 * brittle for short / generic provider names. If the backend cannot be made
 * to emit Pattern A markers, swap `parseCitations` for
 * `parseCitationsByLiteralName` after manually whitelisting longer-than-N
 * candidate names.
 *
 * On replies WITHOUT any markers, this parser is a graceful no-op: it returns
 * a single text node containing the original reply.
 */

export type CitationCandidate = {
  /** Stable backend id used inside `[ID:<id>]` markers. */
  candidateId: string;
  /** Human-friendly service / offer name. */
  serviceName: string;
  /** Provider / studio / venue name; optional. */
  providerName?: string | null;
  /** Optional source label shown in the tooltip. */
  sourceLabel?: string | null;
};

export type CitationTextNode = {
  kind: 'text';
  text: string;
};

export type CitationChipNode = {
  kind: 'chip';
  /** 1-based citation index (i.e. the `[1]`, `[2]` rendered to the user). */
  index: number;
  candidate: CitationCandidate;
};

export type CitationNode = CitationTextNode | CitationChipNode;

/**
 * Pattern A marker: `[ID:cand-...]`.
 *
 * The id grammar is permissive (alphanumerics, dash, underscore, dot, colon)
 * because backend candidate ids come from multiple upstream sources.
 */
const CITATION_MARKER_REGEX = /\[ID:([A-Za-z0-9._:\-]+)\]/g;

/**
 * Parse the assistant reply into an alternating sequence of text and chip
 * nodes. Citation markers that do not resolve to a known candidate are
 * stripped from the visible text to avoid leaking raw `[ID:…]` tokens into
 * the UI.
 */
export function parseCitations(
  replyText: string,
  candidates: ReadonlyArray<CitationCandidate>,
): CitationNode[] {
  if (!replyText) {
    return [];
  }
  if (!candidates.length) {
    // Strip any stray markers so users never see raw `[ID:…]` tokens, even
    // if the backend emits markers without candidates being attached.
    const cleaned = replyText.replace(CITATION_MARKER_REGEX, '').replace(/\s{2,}/g, ' ');
    return cleaned ? [{ kind: 'text', text: cleaned }] : [];
  }

  const candidateById = new Map<string, CitationCandidate>();
  for (const candidate of candidates) {
    if (candidate?.candidateId) {
      candidateById.set(candidate.candidateId, candidate);
    }
  }

  const nodes: CitationNode[] = [];
  /** Maps candidateId → 1-based citation index assigned on first appearance. */
  const indexByCandidateId = new Map<string, number>();
  let cursor = 0;

  // Reset regex state defensively (the literal is a singleton with /g flag).
  CITATION_MARKER_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CITATION_MARKER_REGEX.exec(replyText)) !== null) {
    const [fullMarker, rawId] = match;
    const candidateId = rawId.trim();
    const candidate = candidateById.get(candidateId);

    // Capture the text segment before this marker.
    const textBefore = replyText.slice(cursor, match.index);
    if (textBefore) {
      nodes.push({ kind: 'text', text: textBefore });
    }

    if (candidate) {
      let index = indexByCandidateId.get(candidateId);
      if (!index) {
        index = indexByCandidateId.size + 1;
        indexByCandidateId.set(candidateId, index);
      }
      nodes.push({ kind: 'chip', index, candidate });
    }
    // If the marker references an unknown id, drop it silently — better than
    // leaking `[ID:…]` to end users.

    cursor = match.index + fullMarker.length;
  }

  // Trailing text after the last marker.
  const tail = replyText.slice(cursor);
  if (tail) {
    nodes.push({ kind: 'text', text: tail });
  }

  // Collapse any double-spaces left behind when markers were stripped without
  // a leading space — purely cosmetic.
  return nodes.map((node) =>
    node.kind === 'text' ? { kind: 'text', text: node.text.replace(/\s{2,}/g, ' ') } : node,
  );
}

/**
 * Convenience: returns true when the reply contains at least one Pattern A
 * marker. Useful for analytics ("did the LLM cite this turn?") and gating.
 */
export function replyContainsCitationMarkers(replyText: string): boolean {
  if (!replyText) return false;
  CITATION_MARKER_REGEX.lastIndex = 0;
  return CITATION_MARKER_REGEX.test(replyText);
}

/* -------------------------------------------------------------------------- */
/* Pattern C fallback — DOCUMENTED, NOT WIRED.                                */
/* -------------------------------------------------------------------------- */
/*
 * If the backend cannot reliably emit Pattern A markers, a pragmatic fallback
 * is to auto-link literal mentions of `service_name` / `provider_name` in the
 * reply text. The trade-offs:
 *
 *   + Works on legacy replies without backend changes.
 *   - Brittle for short or generic names ("Studio", "Calm", "Hub").
 *   - Risk of false positives when the same word appears in unrelated copy.
 *   - Has to do case-insensitive longest-first matching to avoid partial hits.
 *
 * Sketch (left here for the next implementer; intentionally not exported):
 *
 *   function parseCitationsByLiteralName(replyText, candidates) {
 *     const sorted = [...candidates].sort(
 *       (a, b) => (b.serviceName?.length ?? 0) - (a.serviceName?.length ?? 0),
 *     );
 *     // walk replyText, greedy-match each candidate.serviceName (length ≥ 6),
 *     // emit a chip after the matched segment, fall through to text otherwise.
 *   }
 *
 * Ship Pattern A first; revisit Pattern C only if backend marker emission is
 * blocked.
 */
