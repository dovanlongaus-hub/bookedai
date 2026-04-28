export function AdminEmailStatusNote() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <h2 className="text-xl font-bold">Email checks paused</h2>
      <div
        role="status"
        aria-live="polite"
        className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600"
      >
        Inbox checks are paused so the dashboard keeps loading quickly. We'll switch them back on once the mail provider settings are in place.
      </div>
    </section>
  );
}
