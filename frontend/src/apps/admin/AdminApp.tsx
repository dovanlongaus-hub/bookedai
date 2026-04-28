import { Suspense, lazy, useMemo } from 'react';

import { CommandPalette, type Command } from '../../shared/components/CommandPalette';

const AdminPage = lazy(async () => {
  const module = await import('../../components/AdminPage');
  return { default: module.AdminPage };
});

export function AdminApp() {
  const adminPaletteCommands = useMemo<Command[]>(() => {
    return [
      {
        id: 'admin.reliability_triage',
        label: 'Reliability triage',
        hint: 'reliability panel',
        intent: 'navigate',
        group: 'Actions',
        keywords: ['reliability', 'triage', 'issues'],
        run: () => {
          if (typeof window === 'undefined') {
            return;
          }
          window.dispatchEvent(new CustomEvent('bookedai:admin-panel-open', { detail: { panel: 'reliability' } }));
          const target = document.getElementById('admin-reliability');
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      },
      {
        id: 'admin.pending_handoffs',
        label: 'Pending handoffs',
        hint: 'handoff queue',
        intent: 'navigate',
        group: 'Actions',
        keywords: ['handoff', 'handoffs', 'queue', 'pending'],
        run: () => {
          if (typeof window === 'undefined') {
            return;
          }
          window.dispatchEvent(new CustomEvent('bookedai:admin-panel-open', { detail: { panel: 'handoffs' } }));
          const target = document.getElementById('admin-handoffs');
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      },
      {
        id: 'admin.audit_ledger',
        label: 'Audit ledger',
        hint: 'audit log',
        intent: 'navigate',
        group: 'Help',
        keywords: ['audit', 'ledger', 'log', 'history'],
        run: () => {
          if (typeof window === 'undefined') {
            return;
          }
          window.dispatchEvent(new CustomEvent('bookedai:admin-panel-open', { detail: { panel: 'audit' } }));
          const target = document.getElementById('admin-audit');
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      },
    ];
  }, []);

  return (
    <>
      <Suspense
        fallback={
          <main className="booked-admin-shell booked-page-shell" role="status" aria-live="polite" aria-busy="true">
            <div className="booked-page-frame">
              <div className="booked-runtime-card">
                <div className="booked-runtime-eyebrow text-[var(--apple-blue)]">Admin workspace</div>
                <h1 className="booked-title mt-3 text-2xl font-semibold text-[var(--apple-near-black)]">
                  Opening your admin workspace…
                </h1>
                <p className="booked-body mt-3 max-w-2xl text-sm leading-6 text-black/66">
                  Pulling your action ledger, tenant directory, and reliability views. This usually takes a couple of seconds.
                </p>
              </div>
            </div>
          </main>
        }
      >
        <AdminPage />
      </Suspense>
      <CommandPalette surface="admin" extraCommands={adminPaletteCommands} />
    </>
  );
}
