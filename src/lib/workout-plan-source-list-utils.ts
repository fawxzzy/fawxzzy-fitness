import type { RoutineDayRow } from "@/types/db";

export type WorkoutPlanSourceCandidateDay = Pick<
  RoutineDayRow,
  "id" | "routine_id" | "day_index" | "name" | "is_rest" | "notes" | "duplicate_source_routine_day_id" | "workout_plan_template_id"
>;

function normalizeWorkoutPlanSourceTitleKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function dedupeWorkoutPlanSourceItemsByTitle<T extends { title: string | null | undefined }>(items: T[]) {
  const seenTitleKeys = new Set<string>();

  return items.filter((item) => {
    const titleKey = normalizeWorkoutPlanSourceTitleKey(item.title);
    if (!titleKey) {
      return true;
    }

    if (seenTitleKeys.has(titleKey)) {
      return false;
    }

    seenTitleKeys.add(titleKey);
    return true;
  });
}

export function selectCanonicalWorkoutPlanSourceDays(args: {
  routineDays: WorkoutPlanSourceCandidateDay[];
  currentRoutineId: string;
  excludeDayId?: string | null;
  runnableExerciseCountByDayId: Map<string, number>;
}) {
  const canonicalDayBySourceId = new Map<string, WorkoutPlanSourceCandidateDay>();

  for (const day of args.routineDays) {
    if (args.excludeDayId && day.id === args.excludeDayId) {
      continue;
    }

    if (day.is_rest) {
      continue;
    }

    const runnableExerciseCount = args.runnableExerciseCountByDayId.get(day.id) ?? 0;
    if (runnableExerciseCount <= 0) {
      continue;
    }

    const canonicalSourceId = day.workout_plan_template_id ?? day.duplicate_source_routine_day_id ?? day.id;
    const existingDay = canonicalDayBySourceId.get(canonicalSourceId);
    if (!existingDay) {
      canonicalDayBySourceId.set(canonicalSourceId, day);
      continue;
    }

    const existingIsCurrentRoutine = existingDay.routine_id === args.currentRoutineId;
    const nextIsCurrentRoutine = day.routine_id === args.currentRoutineId;
    if (existingIsCurrentRoutine !== nextIsCurrentRoutine) {
      canonicalDayBySourceId.set(canonicalSourceId, nextIsCurrentRoutine ? day : existingDay);
      continue;
    }

    if (day.day_index < existingDay.day_index) {
      canonicalDayBySourceId.set(canonicalSourceId, day);
    }
  }

  return Array.from(canonicalDayBySourceId.values());
}
