import { appendProgressionPlaybookFormData, type ProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";
import type { RoutineDetailsDraft } from "@/lib/routine-details-form";
import { resolveRoutineSchedule } from "@/lib/routine-schedule-resolution";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
/** Monday-first, the order people read a week in. */
const WEEKDAY_READING_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function parseUtcDate(dateOnly: string) {
  const timestamp = Date.parse(`${dateOnly}T00:00:00Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatShortDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(timestamp));
}

function withFrom(shape: string, timestamp: number | null) {
  return timestamp === null ? shape : `${shape}, from ${formatShortDate(timestamp)}`;
}

/**
 * One plain line for the schedule (SIMPLIFY #8), worded from the same repeat tier the schedule resolver uses
 * (lib/routine-schedule-resolution.ts), so it never promises a rhythm the app does not follow:
 * - `rolling_n_day`: day 1 comes back every N days ("Repeats every 5 days").
 * - `weekday_anchored`, cycle <= 7: repeats weekly; day slots that do not fit the cycle stay unscheduled. The training
 *   weekdays are named ("Weekly on Mon, Wed, Fri"). Migration 055 made every older routine weekday_anchored, so a
 *   5-day routine started on a Tuesday reads "Weekly on Tue, Wed, Thu, Fri, Sat", not "every 5 days".
 * - cycle 8-14: repeats every two weeks; cycle 15+: repeats every 31 days (the cycle is capped at 31), with the days
 *   after the plan unscheduled.
 * `restDayIndexes` (1-based day slots marked rest) leaves rest days out of the weekday list when the page knows them.
 */
export function describeRoutineSchedule(
  draft: Pick<RoutineDetailsDraft, "scheduleMode" | "cycleLengthDays" | "startDate">,
  restDayIndexes: readonly number[] = [],
) {
  const start = parseUtcDate(draft.startDate);
  const cycleLengthDays = Math.max(1, Math.trunc(draft.cycleLengthDays) || 1);

  if (draft.scheduleMode === "rolling_n_day") {
    return withFrom(cycleLengthDays === 1 ? "Every day" : `Repeats every ${cycleLengthDays} days`, start);
  }

  const resolution = resolveRoutineSchedule({
    scheduleMode: "weekday_anchored",
    cycleLengthDays,
    anchorDate: draft.startDate,
    today: draft.startDate,
  });
  const repeatTier = resolution.repeatTier ?? "weekly";
  const planDays = resolution.effectiveCycleLengthDays ?? cycleLengthDays;

  if (repeatTier === "weekly") {
    if (start === null) return "Weekly";
    const rest = new Set(restDayIndexes);
    const trainingWeekdays = new Set<number>();
    for (let slot = 1; slot <= planDays; slot += 1) {
      if (!rest.has(slot)) trainingWeekdays.add(new Date(start + (slot - 1) * MS_PER_DAY).getUTCDay());
    }
    if (trainingWeekdays.size === 0) return "Weekly, all rest days";
    if (trainingWeekdays.size === 7) return "Weekly, every day";
    const names = WEEKDAY_READING_ORDER.filter((weekday) => trainingWeekdays.has(weekday)).map((weekday) => WEEKDAY_SHORT[weekday]);
    return `Weekly on ${names.join(", ")}`;
  }

  const spanDays = repeatTier === "biweekly" ? 14 : 31;
  const lead = repeatTier === "biweekly" ? "Every 2 weeks" : "Every 31 days";
  const offDays = spanDays - planDays;
  return withFrom(offDays > 0 ? `${lead}: ${planDays}-day plan, ${offDays} ${offDays === 1 ? "day" : "days"} off` : lead, start);
}

/**
 * The updateRoutineAction payload for routine settings. `applyRoutineDefaultToExercises=1` makes the server overwrite
 * the progress rules on every non-stretch exercise in the routine, so it is sent ONLY when the person explicitly chose
 * "Apply to all exercises" (More options > Progress rules) and confirmed the overwrite. The simple Auto-progress switch
 * never sends it: turning auto-progress on or off changes the routine default for new exercises only.
 */
export function buildRoutineSettingsFormData(args: {
  routineId: string;
  existingStartDate: string;
  draft: RoutineDetailsDraft;
  timezone: string;
  progressionDraft: ProgressionPlaybookFormState;
  returnHref: string;
  applyToAllExercisesConfirmed: boolean;
}) {
  const formData = new FormData();
  formData.set("routineId", args.routineId);
  formData.set("existingStartDate", args.existingStartDate);
  formData.set("name", args.draft.name.trim());
  formData.set("cycleLengthDays", String(args.draft.cycleLengthDays));
  formData.set("scheduleMode", args.draft.scheduleMode);
  formData.set("startDate", args.draft.startDate);
  formData.set("startWeekday", args.draft.startWeekday);
  formData.set("timezone", args.timezone);
  formData.set("weightUnit", args.draft.weightUnit);
  formData.set("distanceUnit", args.draft.distanceUnit);
  appendProgressionPlaybookFormData(formData, args.progressionDraft);
  formData.set("returnTo", args.returnHref);
  if (args.applyToAllExercisesConfirmed) {
    formData.set("applyRoutineDefaultToExercises", "1");
  }
  return formData;
}
