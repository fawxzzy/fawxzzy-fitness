type RoutineLimitCandidate = {
  id: string;
  name?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type WorkoutPlanLimitCandidate = {
  id: string;
  name?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export const BASE_ROUTINE_LIMIT = 3;
export const BASE_SAVED_WORKOUT_PLAN_LIMIT = 14;

export const ROUTINE_LIMIT_PRO_REQUIRED_MESSAGE =
  "Base includes up to 3 routines. Upgrade to Pro to restore unlimited routine access.";

export const WORKOUT_PLAN_LIMIT_PRO_REQUIRED_MESSAGE =
  "Base includes up to 14 saved workout plans. Upgrade to Pro to restore unlimited workout plan access.";

function compareNullableTimestampDesc(left?: string | null, right?: string | null) {
  const normalizedLeft = left ?? "";
  const normalizedRight = right ?? "";
  if (normalizedLeft === normalizedRight) {
    return 0;
  }

  return normalizedLeft < normalizedRight ? 1 : -1;
}

function compareStableNameAsc(
  left: { id: string; name?: string | null },
  right: { id: string; name?: string | null },
) {
  const nameCompare = (left.name ?? "").localeCompare(right.name ?? "");
  if (nameCompare !== 0) {
    return nameCompare;
  }

  return left.id.localeCompare(right.id);
}

export function selectAccessibleRoutineIdsForTier(args: {
  routines: RoutineLimitCandidate[];
  accessState: "free" | "pro";
  activeRoutineId?: string | null;
}) {
  if (args.accessState === "pro") {
    return new Set(args.routines.map((routine) => routine.id));
  }

  const activeRoutineId = args.activeRoutineId?.trim() || null;
  const ordered = args.routines
    .slice()
    .sort((left, right) => {
      if (activeRoutineId) {
        if (left.id === activeRoutineId && right.id !== activeRoutineId) {
          return -1;
        }
        if (right.id === activeRoutineId && left.id !== activeRoutineId) {
          return 1;
        }
      }

      const updatedCompare = compareNullableTimestampDesc(left.updated_at, right.updated_at);
      if (updatedCompare !== 0) {
        return updatedCompare;
      }

      const createdCompare = compareNullableTimestampDesc(left.created_at, right.created_at);
      if (createdCompare !== 0) {
        return createdCompare;
      }

      return compareStableNameAsc(left, right);
    });

  return new Set(ordered.slice(0, BASE_ROUTINE_LIMIT).map((routine) => routine.id));
}

export function selectAccessibleWorkoutPlanTemplateIdsForTier(args: {
  templates: WorkoutPlanLimitCandidate[];
  accessState: "free" | "pro";
}) {
  if (args.accessState === "pro") {
    return new Set(args.templates.map((template) => template.id));
  }

  const ordered = args.templates
    .slice()
    .sort((left, right) => {
      const updatedCompare = compareNullableTimestampDesc(left.updated_at, right.updated_at);
      if (updatedCompare !== 0) {
        return updatedCompare;
      }

      const createdCompare = compareNullableTimestampDesc(left.created_at, right.created_at);
      if (createdCompare !== 0) {
        return createdCompare;
      }

      return compareStableNameAsc(left, right);
    });

  return new Set(ordered.slice(0, BASE_SAVED_WORKOUT_PLAN_LIMIT).map((template) => template.id));
}

