import { useEffect, useMemo, useState, type ReactNode } from 'react';

type PartnerMatchShortlistProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  emptyState: ReactNode;
  batchSize?: number;
  listClassName?: string;
  className?: string;
  buttonClassName?: string;
  buttonLabel?: string;
  renderMeta?: (state: { visibleCount: number; totalCount: number }) => ReactNode;
  resetKey?: string | number;
};

export function PartnerMatchShortlist<T>({
  items,
  renderItem,
  emptyState,
  batchSize = 3,
  listClassName = 'space-y-3',
  className = '',
  buttonClassName = 'rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950',
  buttonLabel = 'See more results',
  renderMeta,
  resetKey,
}: PartnerMatchShortlistProps<T>) {
  const [visibleCount, setVisibleCount] = useState(batchSize);

  useEffect(() => {
    setVisibleCount(batchSize);
  }, [batchSize, resetKey, items.length]);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );

  if (!items.length) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div className={className}>
      {renderMeta ? renderMeta({ visibleCount: Math.min(visibleCount, items.length), totalCount: items.length }) : null}
      <div className={listClassName}>
        {visibleItems.map((item, index) => renderItem(item, index))}
      </div>
      {items.length > visibleCount ? (
        <button
          type="button"
          onClick={() => {
            setVisibleCount((current) => current + batchSize);
          }}
          className={buttonClassName}
        >
          {buttonLabel}
        </button>
      ) : null}
    </div>
  );
}
