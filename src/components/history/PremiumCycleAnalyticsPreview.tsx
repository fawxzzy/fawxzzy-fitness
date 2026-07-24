export function PremiumCycleAnalyticsPreview() {
  return (
    <section
      aria-label="Premium cycle analytics preview"
      data-history-premium-preview="cycle-analytics"
      className="rounded-[1.15rem] border border-[rgb(var(--accent)/0.24)] bg-[linear-gradient(145deg,rgb(var(--surface-2-rgb)/0.98),rgb(var(--surface-1-rgb)/0.94))] p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]"
    >
      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[rgb(var(--accent)/0.92)]">Locked Pro preview</p>
      <h2 className="mt-1 text-xl font-black tracking-[-0.025em] text-[rgb(var(--text-primary))]">Cycle Analytics</h2>
      <p className="mt-1.5 text-sm leading-5 text-[rgb(var(--text-secondary)/0.94)]">
        Preview placement only. No personalized score, coaching, or prediction is being calculated here.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ["Cycle trend", "Locked"],
          ["Exercise mix", "Locked"],
          ["Progression", "Locked"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[rgb(var(--border-rgb)/0.55)] bg-[rgb(var(--surface-3-rgb)/0.54)] px-2 py-2.5 text-center">
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.1em] text-[rgb(var(--text-muted)/0.9)]">{label}</p>
            <p className="mt-1 text-sm font-black text-[rgb(var(--text-primary)/0.92)]">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
