import { AppPanel } from "@/components/ui/app/AppPanel";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import type { ProgressionDashboardCard } from "@/lib/progression-history-display";

function getToneClassName(tone: ProgressionDashboardCard["tone"]) {
  switch (tone) {
    case "success":
      return "border-[rgb(var(--accent-strong)/0.18)] bg-[rgb(var(--accent-strong)/0.10)]";
    case "danger":
      return "border-[rgb(var(--warning-rgb)/0.18)] bg-[rgb(var(--warning-rgb)/0.08)]";
    case "muted":
      return "border-[rgb(var(--border-strong)/0.08)] bg-[rgb(var(--surface-3-rgb)/0.18)]";
    default:
      return "border-[rgb(var(--border-strong)/0.10)] bg-[rgb(var(--surface-2-rgb)/0.16)]";
  }
}

export function ProgressionDashboardCards({
  cards,
}: {
  cards: ProgressionDashboardCard[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" data-progression-dashboard-cards>
      {cards.map((card) => (
        <AppPanel
          key={card.id}
          className={cn("px-4 py-3 sm:px-5", getToneClassName(card.tone))}
          data-progression-dashboard-card={card.id}
        >
          <div className="space-y-1.5">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.9)]">
              {card.label}
            </p>
            <p className={cn(appTokens.historySectionTitle, "text-[1rem] leading-tight text-[rgb(var(--text-primary)/0.96)]")}>
              {card.value}
            </p>
            {card.detail ? (
              <p className="text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
                {card.detail}
              </p>
            ) : null}
            {card.caption ? (
              <p className="text-[0.72rem] leading-5 text-[rgb(var(--text-muted)/0.82)]">
                {card.caption}
              </p>
            ) : null}
          </div>
        </AppPanel>
      ))}
    </div>
  );
}
