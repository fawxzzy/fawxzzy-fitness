import type { RoutineDayRow } from "@/types/db";

export type WorkoutPlanSourceCandidateDay = Pick<
  RoutineDayRow,
  "id" | "routine_id" | "day_index" | "name" | "is_rest" | "notes" | "duplicate_source_routine_day_id" | "workout_plan_template_id"
>;

function normalizeWorkoutPlanSourceTitleKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

type WorkoutPlanSourceIdentityItem = {
  title: string | null | undefined;
  workoutPlanTemplateId?: string | null;
  sourceRoutineDayId?: string | null;
  id?: string | null;
};

function buildWorkoutPlanSourceIdentityKey(item: WorkoutPlanSourceIdentityItem) {
  const templateId = item.workoutPlanTemplateId?.trim();
  if (templateId) {
    return `template:${templateId}`;
  }

  const sourceRoutineDayId = item.sourceRoutineDayId?.trim();
  if (sourceRoutineDayId) {
    return `source:${sourceRoutineDayId}`;
  }

  const id = item.id?.trim();
  if (id) {
    return `item:${id}`;
  }

  return "";
}

export function dedupeWorkoutPlanSourceItemsByTitle<T extends WorkoutPlanSourceIdentityItem>(items: T[]) {
  const seenIdentityKeys = new Set<string>();
  const templateBackedTitleKeys = new Set<string>();
  const seenLegacyTitleKeys = new Set<string>();

  const dedupedItems = items.filter((item) => {
    const identityKey = buildWorkoutPlanSourceIdentityKey(item);
    if (identityKey) {
      if (seenIdentityKeys.has(identityKey)) {
        return false;
      }

      seenIdentityKeys.add(identityKey);
    }

    const titleKey = normalizeWorkoutPlanSourceTitleKey(item.title);
    if (!titleKey) {
      return true;
    }

    if (item.workoutPlanTemplateId?.trim()) {
      templateBackedTitleKeys.add(titleKey);
      return true;
    }

    if (templateBackedTitleKeys.has(titleKey) || seenLegacyTitleKeys.has(titleKey)) {
      return false;
    }

    seenLegacyTitleKeys.add(titleKey);
    return true;
  });

  return dedupedItems;
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
