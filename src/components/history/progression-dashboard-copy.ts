import type {
  ProgressionDashboardCard,
  ProgressionHistoryChartSection,
  ProgressionHistoryDisplayRow,
} from "@/lib/progression-history-display";

// ---- Progress tab, wave 2 (SIMPLIFY #11 and the #12 glossary, 2026-11-26) ----
// Progress leads with "Lifts that went up" (name, then before -> after). Deloads, manual changes, monthly activity and
// the kinds of change sit under Details in plain words. The lib labels ("Promotion applied", "Deload applied", "event")
// stay as they are for other callers; these helpers decide what the History tab prints.

const PLAIN_EVENT_LABELS: Record<string, string> = {
  promotion_applied: "Went up",
  promotion_reverted: "Undone",
  deload_applied: "Lighter week",
  manual_target_change: "You changed the goal",
  lock_in: "Locked in",
  review_acknowledged: "Reviewed",
  watch_applied: "Watching",
};

export function toPlainEventLabel(eventType: string, fallback?: string): string {
  return PLAIN_EVENT_LABELS[eventType] ?? fallback ?? "Change";
}

export type LiftThatWentUp = {
  exerciseName: string;
  before: string | null;
  after: string | null;
  timesUp: number;
};

type LiftRow = Pick<ProgressionHistoryDisplayRow, "eventTypeValue" | "exerciseName" | "fromTargetLabel" | "toTargetLabel">;

/**
 * One line per exercise that went up, newest first: the goal before its first raise and after its latest raise.
 * `rows` are the ledger rows, newest first (the loader's order).
 */
export function buildLiftsThatWentUp(rows: readonly LiftRow[], limit = 5): LiftThatWentUp[] {
  const byExercise = new Map<string, LiftThatWentUp>();
  for (const row of rows) {
    if (row.eventTypeValue !== "promotion_applied") {
      continue;
    }
    const existing = byExercise.get(row.exerciseName);
    if (existing) {
      // Older raise: its starting point is the new "before".
      existing.before = row.fromTargetLabel ?? existing.before;
      existing.timesUp += 1;
      continue;
    }
    byExercise.set(row.exerciseName, {
      exerciseName: row.exerciseName,
      before: row.fromTargetLabel,
      after: row.toTargetLabel,
      timesUp: 1,
    });
  }
  return [...byExercise.values()].slice(0, Math.max(0, limit));
}

const DETAIL_STAT_LABELS: Record<string, string> = {
  "promotions-applied": "Went up in total",
  "deloads-applied": "Lighter weeks",
  "manual-target-changes": "Goals you changed",
  "latest-change": "Latest change",
};

/** The Details stats, in plain words: total raises, lighter weeks, goals you changed, latest change. */
export function toProgressDetailStats(cards: ProgressionDashboardCard[]): ProgressionDashboardCard[] {
  const order = Object.keys(DETAIL_STAT_LABELS);
  return cards
    .filter((card) => order.includes(card.id))
    .sort((left, right) => order.indexOf(left.id) - order.indexOf(right.id))
    .map((card) => ({
      ...card,
      label: DETAIL_STAT_LABELS[card.id] ?? card.label,
      // Latest change keeps only its date; the lib's event label ("Promotion applied") is not plain words.
      detail: card.id === "latest-change" ? (card.caption ?? null) : null,
      caption: null,
    }));
}

function changeCountLabel(count: number) {
  return `${count} ${count === 1 ? "change" : "changes"}`;
}

/** The Details charts: changes per month and the kinds of change, retitled in plain words. */
export function toProgressDetailCharts(sections: ProgressionHistoryChartSection[]): ProgressionHistoryChartSection[] {
  const plain: ProgressionHistoryChartSection[] = [];
  for (const section of sections) {
    if (section.id === "monthly-activity") {
      plain.push({
        ...section,
        title: "Changes per month",
        description: "How many goals changed each month.",
        emptyTitle: "Nothing changed yet.",
        bars: section.bars.map((bar) => ({ ...bar, valueLabel: changeCountLabel(bar.value), detail: null })),
      });
    } else if (section.id === "event-mix") {
      plain.push({
        ...section,
        title: "Kinds of change",
        description: "Went up, lighter weeks and goals you changed.",
        emptyTitle: "Nothing changed yet.",
        bars: section.bars.map((bar) => ({ ...bar, label: toPlainEventLabel(bar.id, bar.label), valueLabel: changeCountLabel(bar.value) })),
      });
    }
  }
  return plain;
}

/** "3 this month" from the promotions-this-month card, or null when none. */
export function liftsUpThisMonthLabel(cards: ProgressionDashboardCard[]): string | null {
  const card = cards.find((entry) => entry.id === "promotions-this-month");
  const count = card ? Number.parseInt(card.value, 10) : 0;
  return Number.isFinite(count) && count > 0 ? `${count} this month` : null;
}
