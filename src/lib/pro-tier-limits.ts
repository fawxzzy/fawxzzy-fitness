import { excludeArchivedRoutines } from "@/lib/routine-archive";

type RoutineLimitCandidate = {
  id: string;
  name?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  /** Archived routines never count toward the Free plan limit and are not accessible until restored. */
  archived_at?: string | null;
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
  "The Free plan includes up to 3 routines. Upgrade to Pro to restore unlimited routine access.";

export const WORKOUT_PLAN_LIMIT_PRO_REQUIRED_MESSAGE =
  "The Free plan includes up to 14 saved days. Upgrade to Pro to restore unlimited saved days.";

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
  const listedRoutines = excludeArchivedRoutines(args.routines);
  if (args.accessState === "pro") {
    return new Set(listedRoutines.map((routine) => routine.id));
  }

  const activeRoutineId = args.activeRoutineId?.trim() || null;
  const ordered = listedRoutines
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

/**
 * Whether one more routine may join the list (restore from Archived). Free keeps at most BASE_ROUTINE_LIMIT
 * non-archived routines; Pro has no limit. `listedRoutineCount` counts non-archived routines only.
 */
export function canAddListedRoutineForTier(args: { listedRoutineCount: number; accessState: "free" | "pro" }) {
  return args.accessState === "pro" || args.listedRoutineCount < BASE_ROUTINE_LIMIT;
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

