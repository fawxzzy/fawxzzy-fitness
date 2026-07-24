import type { RecoveryTimingInsight } from "@/lib/recovery-timing";

export function RecoveryTimingPrompt({ insight }: { insight: RecoveryTimingInsight }) {
  return (
    <aside className="mx-3 mb-3 rounded-xl border border-[rgb(var(--warning-rgb)/0.22)] bg-[rgb(var(--warning-rgb)/0.09)] px-3 py-2.5" aria-label="Observed rest timing">
      <p className="text-sm font-black text-[rgb(var(--text-primary)/0.96)]">{insight.label}</p>
    </aside>
  );
}
