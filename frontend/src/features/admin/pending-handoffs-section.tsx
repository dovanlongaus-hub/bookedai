import { useMemo } from 'react';

import {
  AdminPendingHandoffItem,
  AdminPendingHandoffsResponse,
  formatDateTime,
} from './types';

type PendingHandoffsSectionProps = {
  data: AdminPendingHandoffsResponse | null;
  loading?: boolean;
  errorMessage?: string | null;
  onRefresh?: () => void;
  onClaim?: (conversationId: string) => void;
  claimingConversationId?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  support_handoff: 'Pending — waiting for human',
  support_handoff_failed: 'Failed to reach team',
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll('_', ' ');
}

function statusToneClass(status: string, failed: boolean): string {
  if (failed || status === 'support_handoff_failed') {
    return 'bg-rose-50 text-rose-900 ring-1 ring-inset ring-rose-200';
  }
  return 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200';
}

function customerHandle(item: AdminPendingHandoffItem): string {
  if (item.telegram_username) {
    return `@${item.telegram_username}`;
  }
  if (item.telegram_chat_id) {
    return `chat ${item.telegram_chat_id}`;
  }
  return item.sender_name || 'Unknown customer';
}

export function PendingHandoffsSection({
  data,
  loading,
  errorMessage,
  onRefresh,
  onClaim,
  claimingConversationId,
}: PendingHandoffsSectionProps) {
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const pendingCount = data?.pending_count ?? 0;
  const failedCount = data?.failed_count ?? 0;

  return (
    <section className="template-card mb-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="template-kicker text-sm tracking-[0.14em]">Pending handoffs</div>
          <h2 className="template-heading text-2xl">
            {pendingCount} waiting · {failedCount} failed
          </h2>
          <p className="template-body mt-1 text-sm">
            Conversations where the customer pressed <strong>Talk to support</strong> or sent
            <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">/support</code>.
            Reach out via the Telegram chat link before the bot's 5-minute debounce expires.
          </p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        ) : null}
      </header>

      {errorMessage ? (
        <div className="mt-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <ul className="mt-5 space-y-3">
        {items.length === 0 && !errorMessage ? (
          <li className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
            No pending handoffs in the last 72 hours. The bot is keeping up.
          </li>
        ) : null}
        {items.map((item) => {
          const failed =
            item.support_handoff_failed || item.customer_care_status === 'support_handoff_failed';
          const handoffSummary =
            item.support_handoff_targets > 0
              ? `${item.support_handoff_delivered}/${item.support_handoff_targets} staff chats reached`
              : null;
          const telegramDeepLink = item.telegram_chat_id
            ? `tg://user?id=${item.telegram_chat_id}`
            : null;
          return (
            <li
              key={item.event_id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusToneClass(item.customer_care_status, failed)}`}>
                      {statusLabel(item.customer_care_status)}
                    </span>
                    <span>{formatDateTime(item.created_at)}</span>
                    <span className="hidden md:inline">·</span>
                    <span className="hidden uppercase tracking-wide md:inline">{item.channel}</span>
                  </div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {customerHandle(item)}
                  </div>
                  {item.last_message ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {item.last_message}
                    </p>
                  ) : null}
                  {handoffSummary ? (
                    <p className="mt-1 text-xs text-slate-500">{handoffSummary}</p>
                  ) : null}
                  {item.booking_reference ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Booking <code className="rounded bg-slate-100 px-1 py-0.5">{item.booking_reference}</code>
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
                  {telegramDeepLink ? (
                    <a
                      href={telegramDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Open in Telegram
                    </a>
                  ) : null}
                  {onClaim && item.conversation_id ? (
                    <button
                      type="button"
                      onClick={() => onClaim(item.conversation_id as string)}
                      disabled={
                        claimingConversationId === item.conversation_id || item.claim_active
                      }
                      title={
                        item.claim_active
                          ? `Already claimed${item.claimed_by ? ` by ${item.claimed_by}` : ''}`
                          : 'Claim this conversation. The bot will pause auto-replies for 4h.'
                      }
                      className="rounded-full border border-emerald-600 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {claimingConversationId === item.conversation_id
                        ? 'Claiming…'
                        : item.claim_active
                          ? `Claimed${item.claimed_by ? ` · ${item.claimed_by}` : ''}`
                          : 'Claim'}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
