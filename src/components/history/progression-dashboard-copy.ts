import type { ProgressionDashboardCard, ProgressionHistoryChartSection } from "@/lib/progression-history-display";

// Plain-word Progression summary (DESIGN #7, pure): lead with "Promotions this month" and the top progressed lift,
// and drop the engineering rows ("Total events", "Most active vector", "Most active method") and the vector chart.
// The lib keeps building every card (other screens and tests read them); this decides what the History tab shows.

const LEAD_ORDER = [
  "promotions-this-month",
  "top-progressed",
  "latest-change",
  "promotions-applied",
  "deloads-applied",
  "manual-target-changes",
] as const;

const HIDDEN_CARD_IDS = new Set(["total-events", "most-active-vector", "most-active-method", "events-this-month"]);
const HIDDEN_CHART_IDS = new Set(["vector-distribution"]);

const PLAIN_LABELS: Record<string, string> = {
  "promotions-applied": "Promotions in total",
  "deloads-applied": "Deloads",
};

export function toPlainProgressionDashboard(cards: ProgressionDashboardCard[]): ProgressionDashboardCard[] {
  const rank = (id: string) => {
    const index = (LEAD_ORDER as readonly string[]).indexOf(id);
    return index === -1 ? LEAD_ORDER.length : index;
  };
  return cards
    .filter((card) => !HIDDEN_CARD_IDS.has(card.id))
    .map((card, index) => ({ card, index }))
    .sort((left, right) => rank(left.card.id) - rank(right.card.id) || left.index - right.index)
    .map(({ card }) => (PLAIN_LABELS[card.id] ? { ...card, label: PLAIN_LABELS[card.id] } : card));
}

export function toPlainProgressionChartSections(sections: ProgressionHistoryChartSection[]): ProgressionHistoryChartSection[] {
  return sections.filter((section) => !HIDDEN_CHART_IDS.has(section.id));
}
