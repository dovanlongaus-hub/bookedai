import { AdminConfigEntry } from './types';

type LiveConfigurationSectionProps = {
  configItems: AdminConfigEntry[];
};

export function LiveConfigurationSection({ configItems }: LiveConfigurationSectionProps) {
  const configCategories = [...new Set(configItems.map((item) => item.category))];

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <h2 className="text-xl font-bold">Live configuration</h2>
      <div className="mt-5 space-y-5">
        {configCategories.map((category) => (
          <div key={category} className="rounded-[1.5rem] border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {category}
            </div>
            <div className="divide-y divide-slate-200">
              {configItems
                .filter((item) => item.category === category)
                .map((item) => (
                  <div
                    key={item.key}
                    className="grid grid-cols-[1fr_1.3fr_80px] gap-3 px-4 py-3 text-sm text-slate-700"
                  >
                    <div className="font-semibold text-slate-950">{item.key}</div>
                    <div
                      className={`break-all ${item.masked ? 'select-none' : ''}`}
                      onCopy={
                        item.masked
                          ? (event) => {
                              event.preventDefault();
                            }
                          : undefined
                      }
                    >
                      {item.value || 'Not set'}
                    </div>
                    <div>{item.masked ? 'Protected' : 'Public'}</div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
