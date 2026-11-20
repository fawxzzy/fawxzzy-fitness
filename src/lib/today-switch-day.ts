import { formatRoutineDayExerciseCountLabel } from "@/lib/routine-day-card-summary";
import { getRoutineDayHeading, getRoutineDayWeekdayLabel } from "@/lib/routines";

/**
 * Pure model for one Switch Day card (Today, day picker open). No chips or tags: the title names the day, one
 * meta line carries the plain-text facts (position, weekday or "Today", exercise count, status), and training
 * days add a short snapshot of their first exercises (an empty day says "No exercises" in its meta line and has no
 * snapshot). Rest days collapse to a one-line "Rest day" card.
 */
export const SWITCH_DAY_SNAPSHOT_LIMIT = 3;
export const SWITCH_DAY_REST_TITLE = "Rest day";

export type SwitchDayCardInput = {
  dayIndex: number;
  name: string | null | undefined;
  occurrenceWeekday?: string | null;
  isRest: boolean;
  exercises: ReadonlyArray<{ name: string | null | undefined }>;
};

export type SwitchDayCardFlags = {
  isToday: boolean;
  isSelected: boolean;
  isCompleted: boolean;
  isInSession: boolean;
};

export type SwitchDayCardModel =
  | {
    kind: "rest";
    title: string;
    /** Inline facts shown beside the title (custom day name, position, weekday, "Today"). */
    meta: string[];
    tone: "attention" | "current";
  }
  | {
    kind: "training";
    title: string;
    meta: string[];
    /** Up to SWITCH_DAY_SNAPSHOT_LIMIT exercise names, in plan order. */
    snapshotNames: string[];
    /** "and N more" when the day has more exercises than the snapshot shows; null otherwise. */
    snapshotOverflow: string | null;
    tone: "neutral" | "current" | "logged";
  };

export function formatSwitchDaySnapshotOverflow(hiddenCount: number) {
  return hiddenCount > 0 ? `and ${hiddenCount} more` : null;
}

export function buildSwitchDayCardModel(
  day: SwitchDayCardInput,
  flags: SwitchDayCardFlags,
  startDate: string | null | undefined,
): SwitchDayCardModel {
  const heading = getRoutineDayHeading({
    name: day.name ?? null,
    dayIndex: day.dayIndex,
    startDate,
    weekdayLabel: day.occurrenceWeekday?.trim() || getRoutineDayWeekdayLabel(day.dayIndex, startDate, "short"),
    isRest: day.isRest,
  });
  // "Today" replaces nothing: it is an extra plain-text fact, so the weekday stays readable for every day.
  const todayPart = flags.isToday ? ["Today"] : [];
  const names = day.exercises
    .map((exercise) => exercise.name?.trim() ?? "")
    .filter((name) => name.length > 0);

  if (day.isRest) {
    const restCount = names.length > 0 ? [formatRoutineDayExerciseCountLabel(names.length)] : [];
    return {
      kind: "rest",
      title: SWITCH_DAY_REST_TITLE,
      meta: [
        ...(heading.customTitle ? [heading.customTitle] : []),
        heading.positionLabel,
        ...(heading.weekday ? [heading.weekday] : []),
        ...todayPart,
        ...restCount,
      ],
      tone: flags.isSelected ? "current" : "attention",
    };
  }

  const status = flags.isInSession ? ["In progress"] : flags.isCompleted ? ["Done"] : [];
  const snapshotNames = names.slice(0, SWITCH_DAY_SNAPSHOT_LIMIT);

  return {
    kind: "training",
    title: heading.title,
    meta: [
      ...heading.metaParts,
      ...todayPart,
      formatRoutineDayExerciseCountLabel(day.exercises.length),
      ...status,
    ],
    snapshotNames,
    snapshotOverflow: formatSwitchDaySnapshotOverflow(names.length - snapshotNames.length),
    tone: flags.isInSession ? "logged" : flags.isSelected ? "current" : "neutral",
  };
}
