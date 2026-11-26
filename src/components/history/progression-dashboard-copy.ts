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
  /** Stable key for the lift (its routine slot, else exercise id, else name). */
  key: string;
  exerciseName: string;
  /** Set only when two lifts in the list share a name, so the lines can be told apart. */
  routineName: string | null;
  before: string | null;
  after: string | null;
  timesUp: number;
};

type LiftRow = Pick<ProgressionHistoryDisplayRow, "eventTypeValue" | "exerciseName" | "fromTargetLabel" | "toTargetLabel">
  & Partial<Pick<ProgressionHistoryDisplayRow, "exerciseId" | "routineDayExerciseId" | "routineName">>;

type LiftWalk = { lift: LiftThatWentUp | null; pendingReverts: number; closed: boolean; order: number };

function liftKey(row: LiftRow) {
  // A goal belongs to one routine slot; the same exercise in two routines has two goals. Name is the last resort.
  if (row.routineDayExerciseId) return `slot:${row.routineDayExerciseId}`;
  if (row.exerciseId) return `exercise:${row.exerciseId}`;
  return `name:${row.exerciseName}`;
}

/**
 * One line per lift whose CURRENT goal is up, newest first: the goal before the raises that still stand -> the goal now.
 * `rows` are the ledger rows, newest first (the loader's order). Per lift, walking newest -> oldest:
 * - "Undone" (promotion_reverted) cancels the next older raise; an undone raise never shows.
 * - A lighter week or a goal you changed by hand that is NEWER than every standing raise drops the lift: its goal now
 *   is not the raised one, and the labels are text, so netting them out would guess. An older one just ends the run.
 * - Locks, reviews and watch marks do not change the goal and are skipped.
 */
export function buildLiftsThatWentUp(rows: readonly LiftRow[], limit = 5): LiftThatWentUp[] {
  const walks = new Map<string, LiftWalk>();
  let order = 0;
  for (const row of rows) {
    const key = liftKey(row);
    let walk = walks.get(key);
    if (!walk) {
      walk = { lift: null, pendingReverts: 0, closed: false, order: 0 };
      walks.set(key, walk);
    }
    if (walk.closed) continue;
    switch (row.eventTypeValue) {
      case "promotion_reverted":
        walk.pendingReverts += 1;
        break;
      case "promotion_applied":
        if (walk.pendingReverts > 0) {
          walk.pendingReverts -= 1;
          break;
        }
        if (walk.lift) {
          // Older standing raise: its starting point is the new "before".
          walk.lift.before = row.fromTargetLabel ?? walk.lift.before;
          walk.lift.timesUp += 1;
        } else {
          walk.lift = {
            key,
            exerciseName: row.exerciseName,
            routineName: row.routineName ?? null,
            before: row.fromTargetLabel,
            after: row.toTargetLabel,
            timesUp: 1,
          };
          walk.order = order++;
        }
        break;
      case "deload_applied":
      case "manual_target_change":
        walk.closed = true;
        break;
      default:
        break;
    }
  }
  const lifts = [...walks.values()]
    .filter((walk): walk is LiftWalk & { lift: LiftThatWentUp } => walk.lift !== null)
    .sort((left, right) => left.order - right.order)
    .map((walk) => walk.lift)
    .slice(0, Math.max(0, limit));
  const nameCounts = new Map<string, number>();
  for (const lift of lifts) nameCounts.set(lift.exerciseName, (nameCounts.get(lift.exerciseName) ?? 0) + 1);
  return lifts.map((lift) => ({ ...lift, routineName: (nameCounts.get(lift.exerciseName) ?? 0) > 1 ? lift.routineName : null }));
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
