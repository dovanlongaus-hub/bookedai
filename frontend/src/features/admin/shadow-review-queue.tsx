import { useEffect, useMemo, useState } from 'react';

import {
  loadStoredShadowReviewState,
  persistShadowReviewState,
} from './session';
import { ShadowDriftExample } from './types';

type ShadowReviewQueueProps = {
  recentDriftExamples: ShadowDriftExample[];
  onSelectBooking?: (bookingReference: string) => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  payment_status: 'Payment status',
  meeting_status: 'Meeting status',
  workflow_status: 'Workflow status',
  email_status: 'Email status',
  amount: 'Amount',
  field_parity: 'Field parity',
  missing_mirror: 'Missing mirror',
};

function getCategoryLabel(category?: string) {
  if (!category) {
    return 'Unknown';
  }
  return CATEGORY_LABELS[category] ?? category.replaceAll('_', ' ');
}

export function ShadowReviewQueue({
  recentDriftExamples,
  onSelectBooking,
}: ShadowReviewQueueProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [reviewedCaseKeys, setReviewedCaseKeys] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<string>('pending_first');
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [caseNotes, setCaseNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const storedState = loadStoredShadowReviewState();
    setSelectedCategory(storedState.selectedCategory || 'all');
    setReviewedCaseKeys(storedState.reviewedCaseKeys);
    setSortMode(storedState.sortMode || 'pending_first');
    setAutoAdvance(Boolean(storedState.autoAdvance));
    setCaseNotes(storedState.caseNotes || {});
  }, []);

  useEffect(() => {
    persistShadowReviewState({
      selectedCategory,
      reviewedCaseKeys,
      sortMode,
      autoAdvance,
      caseNotes,
    });
  }, [autoAdvance, caseNotes, reviewedCaseKeys, selectedCategory, sortMode]);

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(recentDriftExamples.map((item) => item.category).filter(Boolean)),
    ) as string[];
    return values;
  }, [recentDriftExamples]);

  const getCaseKey = (example: ShadowDriftExample) =>
    `${example.bookingReference ?? example.label}:${example.category ?? 'uncategorized'}`;

  const filteredExamples = useMemo(() => {
    const categoryFiltered =
      selectedCategory === 'all'
        ? recentDriftExamples
        : recentDriftExamples.filter((item) => item.category === selectedCategory);

    return categoryFiltered.slice().sort((left, right) => {
      const leftReviewed = reviewedCaseKeys.includes(getCaseKey(left));
      const rightReviewed = reviewedCaseKeys.includes(getCaseKey(right));

      if (sortMode === 'pending_first') {
        if (leftReviewed !== rightReviewed) {
          return leftReviewed ? 1 : -1;
        }
        return (right.observedAt ?? '').localeCompare(left.observedAt ?? '');
      }

      if (sortMode === 'newest_first') {
        return (right.observedAt ?? '').localeCompare(left.observedAt ?? '');
      }

      if (sortMode === 'oldest_first') {
        return (left.observedAt ?? '').localeCompare(right.observedAt ?? '');
      }

      const categoryCompare = getCategoryLabel(left.category).localeCompare(
        getCategoryLabel(right.category),
      );
      if (categoryCompare !== 0) {
        return categoryCompare;
      }

      if (leftReviewed !== rightReviewed) {
        return leftReviewed ? 1 : -1;
      }

      return (right.observedAt ?? '').localeCompare(left.observedAt ?? '');
    });
  }, [recentDriftExamples, reviewedCaseKeys, selectedCategory, sortMode]);

  const reviewedCount = filteredExamples.filter((item) =>
    reviewedCaseKeys.includes(getCaseKey(item)),
  ).length;
  const pendingCount = filteredExamples.length - reviewedCount;
  const nextPendingExample = filteredExamples.find(
    (item) => !reviewedCaseKeys.includes(getCaseKey(item)),
  );

  function findNextPendingAfter(example: ShadowDriftExample) {
    const currentKey = getCaseKey(example);
    return filteredExamples.find(
      (item) =>
        getCaseKey(item) !== currentKey &&
        !reviewedCaseKeys.includes(getCaseKey(item)) &&
        Boolean(item.bookingReference),
    );
  }

  function toggleReviewed(example: ShadowDriftExample) {
    const caseKey = getCaseKey(example);
    const isCurrentlyReviewed = reviewedCaseKeys.includes(caseKey);
    const nextPendingAfterCurrent = !isCurrentlyReviewed ? findNextPendingAfter(example) : null;
    setReviewedCaseKeys((current) =>
      current.includes(caseKey)
        ? current.filter((item) => item !== caseKey)
        : [...current, caseKey],
    );

    if (autoAdvance && !isCurrentlyReviewed && nextPendingAfterCurrent?.bookingReference) {
      onSelectBooking?.(nextPendingAfterCurrent.bookingReference);
    }
  }

  function markVisibleAsReviewed() {
    setReviewedCaseKeys((current) => {
      const next = new Set(current);
      filteredExamples.forEach((example) => next.add(getCaseKey(example)));
      return Array.from(next);
    });
  }

  function markVisibleAsPending() {
    const visibleKeys = new Set(filteredExamples.map((example) => getCaseKey(example)));
    setReviewedCaseKeys((current) => current.filter((item) => !visibleKeys.has(item)));
  }

  function updateCaseNote(example: ShadowDriftExample, value: string) {
    const caseKey = getCaseKey(example);
    setCaseNotes((current) => ({
      ...current,
      [caseKey]: value,
    }));
  }

  if (recentDriftExamples.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Shadow review queue
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Work through recent drift cases by category, then open booking detail for triage.
          </p>
        </div>
        <div className="text-xs font-medium text-slate-500">
          {reviewedCount} reviewed · {filteredExamples.length} of {recentDriftExamples.length} cases shown
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Review summary
            </div>
            <div className="mt-1 text-sm text-slate-700">
              {pendingCount === 0
                ? 'All visible drift cases are reviewed.'
                : `${pendingCount} visible case${pendingCount === 1 ? '' : 's'} still need review.`}
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(event) => setAutoAdvance(event.target.checked)}
            />
            Auto-advance to next pending case
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              selectedCategory === 'all'
                ? 'bg-slate-950 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedCategory === category
                  ? 'bg-slate-950 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {getCategoryLabel(category)}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Sort
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none transition focus:border-slate-300"
            >
              <option value="pending_first">Pending first</option>
              <option value="newest_first">Newest first</option>
              <option value="oldest_first">Oldest first</option>
              <option value="category_grouped">Category grouped</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={markVisibleAsReviewed}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Mark visible reviewed
            </button>
            <button
              type="button"
              onClick={markVisibleAsPending}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Mark visible pending
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Pending in slice
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{pendingCount}</div>
          <p className="mt-1 text-xs text-slate-500">
            Cases in the current queue view that still need review.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Reviewed in slice
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{reviewedCount}</div>
          <p className="mt-1 text-xs text-slate-500">
            Cases already marked reviewed in the current queue view.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Next review
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-950">
                {nextPendingExample?.bookingReference ?? 'All visible cases reviewed'}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {nextPendingExample
                  ? getCategoryLabel(nextPendingExample.category)
                  : 'Mark a case as pending to continue queue triage.'}
              </p>
            </div>
            <button
              type="button"
              disabled={!nextPendingExample?.bookingReference}
              onClick={() => {
                if (nextPendingExample?.bookingReference) {
                  onSelectBooking?.(nextPendingExample.bookingReference);
                }
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Review next
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {filteredExamples.map((example) => (
          <div
            key={getCaseKey(example)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  reviewedCaseKeys.includes(getCaseKey(example))
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {reviewedCaseKeys.includes(getCaseKey(example)) ? 'Reviewed' : 'Pending review'}
              </span>
              <button
                type="button"
                onClick={() => toggleReviewed(example)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {reviewedCaseKeys.includes(getCaseKey(example))
                  ? 'Mark as pending'
                  : 'Mark reviewed'}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-950">
                {example.bookingReference ?? example.label}
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                {getCategoryLabel(example.category)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{example.note}</p>
            {example.observedAt ? (
              <div className="mt-2 text-xs text-slate-500">Observed: {example.observedAt}</div>
            ) : null}
            <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Legacy
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-700">
                  {example.legacyValue ?? 'Not provided'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Shadow
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-700">
                  {example.shadowValue ?? 'Not provided'}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Team note
                <textarea
                  value={caseNotes[getCaseKey(example)] ?? ''}
                  onChange={(event) => updateCaseNote(example, event.target.value)}
                  rows={3}
                  placeholder="Client-side triage note for this drift case."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none transition focus:border-slate-300"
                />
              </label>
            </div>
            {example.bookingReference ? (
              <button
                type="button"
                onClick={() => {
                  if (example.bookingReference) {
                    onSelectBooking?.(example.bookingReference);
                  }
                }}
                className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Review booking detail
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
