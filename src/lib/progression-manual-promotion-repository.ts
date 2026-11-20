// Supabase-backed repository for Manual Promote (server only; no "use server" so tests can drive
// it with a recording query-builder fake). Every read and write is scoped to the signed-in user.
// Moved out of src/app/progression-review/actions.ts, which re-imports the shared mutation helpers.
import type { ActionResult } from "@/lib/action-result";
import {
  buildProgressionReviewTargetPlan,
  canUseCatalogHistoryFallbackForRoutineExercise,
  getProgressionReviewTargetFingerprintForExercise,
  inferProgressionStepPolicyForRoutineExercise,
  loadProgressionHistoryForExercise,
  resolveRoutineExerciseRepTarget,
} from "@/lib/progression-review-loader";
import { buildProgressionReviewTargetUpdate } from "@/lib/progression-review-target-update";
import {
  buildProgressionHistorySessions,
  deriveProgressionReviewCandidate,
  validateProgressionPlaybookSelection,
} from "@/lib/progression-playbooks";
import { applyEffortScheduleToRoutineDayExercise } from "@/lib/progression-effective-target";
import {
  buildManualPromotionTargetGuard,
  type ManualPromotionExerciseSnapshot,
  type ManualPromotionRepository,
} from "@/lib/progression-manual-promotion";
import { buildProgressionEventPayload, recordProgressionEvent } from "@/lib/progression-events";
import type { supabaseServer } from "@/lib/supabase/server";
import type { RoutineDayExerciseRow } from "@/types/db";

export type ProgressionReviewMutationExerciseRow = RoutineDayExerciseRow & {
  routine_day_id: string;
};

export const PROGRESSION_MUTATION_EXERCISE_SELECT = "id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config";
export const LINKED_PROGRESSION_UPDATE_LIMIT = 12;

export async function readMutationExercisesForRoutine(args: {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  userId: string;
  routineId: string;
  routineDayExerciseIds: string[];
}): Promise<ActionResult<ProgressionReviewMutationExerciseRow[]>> {
  if (args.routineDayExerciseIds.length > LINKED_PROGRESSION_UPDATE_LIMIT) {
    return { ok: false, error: "Too many linked progression updates to apply at once." };
  }

  const { data: exerciseRows, error: exerciseError } = await args.supabase
    .from("routine_day_exercises")
    .select(PROGRESSION_MUTATION_EXERCISE_SELECT)
    .eq("user_id", args.userId)
    .in("id", args.routineDayExerciseIds);

  if (exerciseError || (exerciseRows?.length ?? 0) !== args.routineDayExerciseIds.length) {
    return { ok: false, error: "Linked progression update is no longer available." };
  }

  const exercises = (exerciseRows ?? []) as ProgressionReviewMutationExerciseRow[];
  const routineDayIds = Array.from(new Set(exercises.map((exercise) => exercise.routine_day_id)));
  const { data: routineDays, error: routineDaysError } = await args.supabase
    .from("routine_days")
    .select("id, routine_id")
    .eq("user_id", args.userId)
    .in("id", routineDayIds);

  if (routineDaysError || (routineDays?.length ?? 0) !== routineDayIds.length) {
    return { ok: false, error: "Could not verify linked routine days." };
  }

  const routineIdByDayId = new Map((routineDays ?? []).map((day) => [day.id, day.routine_id]));
  if (exercises.some((exercise) => routineIdByDayId.get(exercise.routine_day_id) !== args.routineId)) {
    return { ok: false, error: "Linked progression update is not part of this routine." };
  }

  const orderById = new Map(args.routineDayExerciseIds.map((id, index) => [id, index]));
  return {
    ok: true,
    data: exercises.sort((left, right) => (orderById.get(left.id) ?? 0) - (orderById.get(right.id) ?? 0)),
  };
}

export function verifyLinkedProgressionFingerprints(args: {
  sourceExercise: ProgressionReviewMutationExerciseRow;
  linkedExercises: ProgressionReviewMutationExerciseRow[];
}) {
  const sourceFingerprint = getProgressionReviewTargetFingerprintForExercise(args.sourceExercise);
  return args.linkedExercises.every((exercise) => getProgressionReviewTargetFingerprintForExercise(exercise) === sourceFingerprint);
}

export function createManualPromotionRepository(args: {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  userId: string;
  routineId: string;
}): ManualPromotionRepository<ProgressionReviewMutationExerciseRow> {
  const { supabase, userId, routineId } = args;
  let fallbackWeightUnit: "lbs" | "kg" = "lbs";
  const dayIndexByDayId = new Map<string, number | null>();
  const toSnapshot = (row: ProgressionReviewMutationExerciseRow): ManualPromotionExerciseSnapshot<ProgressionReviewMutationExerciseRow> => ({
    row,
    id: row.id,
    storedTarget: buildProgressionReviewTargetPlan(row),
    effectiveTarget: buildProgressionReviewTargetPlan(applyEffortScheduleToRoutineDayExercise({
      exercise: row,
      routineDayIndex: dayIndexByDayId.get(row.routine_day_id) ?? null,
    })),
  });

  return {
    async readOwnedExercise(routineDayExerciseId) {
      const { data: exerciseRow, error } = await supabase
        .from("routine_day_exercises")
        .select(PROGRESSION_MUTATION_EXERCISE_SELECT)
        .eq("id", routineDayExerciseId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !exerciseRow) {
        return null;
      }

      const row = exerciseRow as ProgressionReviewMutationExerciseRow;
      const { data: routineDay } = await supabase
        .from("routine_days")
        .select("routine_id, day_index")
        .eq("id", row.routine_day_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!routineDay || routineDay.routine_id !== routineId) {
        return null;
      }

      const { data: routine } = await supabase
        .from("routines")
        .select("weight_unit")
        .eq("id", routineId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!routine) {
        return null;
      }

      fallbackWeightUnit = routine.weight_unit === "kg" ? "kg" : "lbs";
      dayIndexByDayId.set(row.routine_day_id, routineDay.day_index ?? null);
      return toSnapshot(row);
    },
    async hasWorkoutInProgress() {
      const { data, error } = await supabase
        .from("sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "in_progress")
        .limit(1);
      if (error) {
        throw new Error("Could not verify active session state.");
      }

      return (data?.length ?? 0) > 0;
    },
    async readHistory(exercise) {
      const row = exercise.row;
      const allowCatalogFallback = await canUseCatalogHistoryFallbackForRoutineExercise({
        supabase,
        userId,
        routineId,
        exerciseId: row.exercise_id,
      });
      return loadProgressionHistoryForExercise({
        supabase,
        userId,
        routineId,
        exerciseId: row.exercise_id,
        routineDayExerciseId: row.id,
        allowCatalogFallback,
      });
    },
    async deriveCandidate(exercise, historyRows) {
      const row = exercise.row;
      const { data: metadata } = await supabase
        .from("exercises")
        .select("equipment, movement_pattern")
        .eq("id", row.exercise_id)
        .maybeSingle();
      return deriveProgressionReviewCandidate({
        playbookId: row.progression_playbook_id,
        config: row.progression_playbook_config,
        plan: exercise.storedTarget,
        history: buildProgressionHistorySessions({
          rows: historyRows,
          targetSetCount: row.target_sets,
          topRepTarget: resolveRoutineExerciseRepTarget(row),
          limit: 8,
        }),
        historyRows,
        fallbackWeightUnit,
        progressionStepPolicy: inferProgressionStepPolicyForRoutineExercise({
          selection: validateProgressionPlaybookSelection({
            playbookId: row.progression_playbook_id,
            config: row.progression_playbook_config,
          }),
          plan: exercise.storedTarget,
          defaultUnit: row.default_unit,
          fallbackWeightUnit,
          metadata: metadata ? { equipment: metadata.equipment ?? null, movementPattern: metadata.movement_pattern ?? null } : null,
        }),
      });
    },
    async readPromotionEvents(routineDayExerciseId) {
      const { data, error } = await supabase
        .from("progression_events")
        .select("event_type, routine_day_exercise_id, source_session_id, created_at")
        .eq("user_id", userId)
        .eq("routine_day_exercise_id", routineDayExerciseId)
        .in("event_type", ["promotion_applied", "promotion_reverted"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        throw new Error("Could not verify earlier promotions.");
      }

      return data ?? [];
    },
    async readLinkedExercises(source, linkedIds) {
      const result = await readMutationExercisesForRoutine({
        supabase,
        userId,
        routineId,
        routineDayExerciseIds: linkedIds,
      });
      if (!result.ok || !result.data) {
        return null;
      }

      if (!verifyLinkedProgressionFingerprints({ sourceExercise: source.row, linkedExercises: result.data })) {
        return null;
      }

      return result.data.map(toSnapshot);
    },
    async updateTargetIfUnchanged(exercise, nextTarget) {
      let query = supabase
        .from("routine_day_exercises")
        .update(buildProgressionReviewTargetUpdate(nextTarget))
        .eq("id", exercise.id)
        .eq("user_id", userId);
      for (const { column, value } of buildManualPromotionTargetGuard(exercise.row)) {
        query = value === null ? query.is(column, null) : query.eq(column, value as never);
      }

      const { data, error } = await query.select("id");
      if (error) {
        throw new Error("Could not apply the promotion.");
      }

      return (data?.length ?? 0) === 1;
    },
    async restoreTargetIfUnchanged(exercise, appliedTarget) {
      try {
        const original = Object.fromEntries(
          buildManualPromotionTargetGuard(exercise.row).map(({ column, value }) => [column, value]),
        );
        let query = supabase
          .from("routine_day_exercises")
          .update(original)
          .eq("id", exercise.id)
          .eq("user_id", userId);
        // Guard on the values the promotion wrote: if anything changed since, leave it alone.
        for (const [column, value] of Object.entries(buildProgressionReviewTargetUpdate(appliedTarget))) {
          query = value === null ? query.is(column, null) : query.eq(column, value as never);
        }

        const { data, error } = await query.select("id");
        return !error && (data?.length ?? 0) === 1;
      } catch {
        return false;
      }
    },
    async recordPromotionApplied({ exercise, fromTarget, toTarget, reason, sourceSessionId }) {
      const result = await recordProgressionEvent({
        supabase,
        payload: buildProgressionEventPayload({
          userId,
          routineId,
          routineDayExerciseId: exercise.id,
          exerciseId: exercise.row.exercise_id,
          eventType: "promotion_applied",
          fromTarget,
          toTarget,
          reason,
          playbookId: exercise.row.progression_playbook_id,
          config: exercise.row.progression_playbook_config,
          sourceSessionId,
        }),
        context: "progressionReview.promoteExerciseAction",
      });
      return result.ok;
    },
  };
}