/**
 * Card copy for routine summaries. Canonical terms (AGENT.md): routine, day, workout, session, exercise, set.
 * Older builds and the offline routines cache stored "workout plans" and "sessions logged" strings;
 * normalizing at render time keeps cached snapshots readable without a cache schema bump.
 */

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export function normalizeRoutineSummaryPart(rawPart: string): string {
  const part = rawPart.trim();
  const lower = part.toLowerCase();

  if (lower === "no sessions logged" || lower === "no logs") {
    return "No sessions yet";
  }

  if (lower === "new") {
    return "Not started";
  }

  const counted = part.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (!counted) {
    return part;
  }

  const count = Number(counted[1].replace(",", "."));
  const noun = counted[2].trim().toLowerCase();

  if (noun === "workout plan" || noun === "workout plans" || noun === "plan" || noun === "plans") {
    return `${counted[1]} ${pluralize(count, "day")}`;
  }

  if (noun === "train" || noun === "training") {
    return `${counted[1]} training ${pluralize(count, "day")}`;
  }

  if (noun === "rest" || noun === "rest day" || noun === "rest days") {
    return `${counted[1]} rest ${pluralize(count, "day")}`;
  }

  if (noun === "session logged" || noun === "sessions logged" || noun === "log" || noun === "logs") {
    return `${counted[1]} ${pluralize(count, "session")}`;
  }

  return part;
}

export function normalizeRoutineSummaryParts(parts: string[]): string[] {
  const normalized = parts.map(normalizeRoutineSummaryPart).filter((part) => part.length > 0);
  // "5 days" is training + rest days restated; keep it only when the split is not shown.
  const hasDaySplit = normalized.some((part) => /^\d+ training days?$/.test(part))
    && normalized.some((part) => /^\d+ rest days?$/.test(part));

  return hasDaySplit ? normalized.filter((part) => !/^\d+ days?$/.test(part)) : normalized;
}

export type RoutineWeekCellInput = {
  dayIndex: number;
  weekdayLabel: string;
  isRest: boolean;
  isCompleted?: boolean;
  isSkipped?: boolean;
  exerciseCount: number;
};

export type RoutineWeekCell = {
  /** Top label: a 3-letter weekday, or "Day N" when the routine has no start weekday. */
  label: string;
  /** Visible value: the exercise count, "Rest", or an en dash for an empty day. */
  value: string;
  /** Non-colour status glyph (done / skipped) or null. */
  glyph: string | null;
  /** Full sentence for assistive tech, so the visual abbreviations are never the only text. */
  description: string;
  isRest: boolean;
};

export function buildRoutineWeekCell(day: RoutineWeekCellInput): RoutineWeekCell {
  const weekday = day.weekdayLabel.trim();
  const hasWeekday = weekday.length > 0 && !/^day\b/i.test(weekday);
  const label = hasWeekday ? weekday.slice(0, 3) : `Day ${day.dayIndex}`;
  const status = day.isCompleted ? "done" : day.isSkipped ? "skipped" : null;

  if (day.isRest) {
    return {
      label,
      value: "Rest",
      glyph: status === "done" ? "✓" : status === "skipped" ? "⊘" : null,
      description: `Day ${day.dayIndex}${hasWeekday ? `, ${weekday}` : ""}: rest day${status ? `, ${status}` : ""}`,
      isRest: true,
    };
  }

  const exerciseLabel = `${day.exerciseCount} ${pluralize(day.exerciseCount, "exercise")}`;
  return {
    label,
    value: day.exerciseCount > 0 ? String(day.exerciseCount) : "–",
    glyph: status === "done" ? "✓" : status === "skipped" ? "⊘" : null,
    description: `Day ${day.dayIndex}${hasWeekday ? `, ${weekday}` : ""}: ${day.exerciseCount > 0 ? exerciseLabel : "no exercises"}${status ? `, ${status}` : ""}`,
    isRest: false,
  };
}
