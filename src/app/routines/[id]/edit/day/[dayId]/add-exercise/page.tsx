import { notFound } from "next/navigation";
import {
  addRoutineDayExerciseAction,
  loadWorkoutPlanEditDecisionStateAction,
  resolveWorkoutPlanEditDecisionAction,
} from "@/app/routines/[id]/edit/day/actions";
import { EditDayAddExerciseScreen } from "@/app/routines/[id]/edit/day/[dayId]/EditDayAddExerciseScreen";
import { AddExerciseScaffold } from "@/components/exercises/AddExerciseScaffold";
import { resolveAddExerciseWeightUnit } from "@/lib/add-exercise-weight-unit";
import { formatAddExerciseSubtitle } from "@/lib/header-meta";
import { requireUser } from "@/lib/auth";
import { loadExerciseChooserRouteData } from "@/lib/exercise-chooser-route-data";
import { loadAccessibleRoutineIdsForCurrentTier } from "@/lib/pro-tier-access";
import { getRoutineDayEditHref } from "@/lib/routine-day-navigation";
import { formatRoutineDayDisplayName } from "@/lib/routines";
import { isMissingRoutineDefaultProgressionColumnError } from "@/lib/progression-schema-compat";
import { supabaseServer } from "@/lib/supabase/server";
import { loadRoutineDayWithWorkoutPlanCompat, loadWorkoutPlanNames } from "@/lib/workout-plan-templates";
import type { RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
    dayId: string;
  }>;
  searchParams?: Promise<{
    exerciseId?: string;
  }>;
};

const ROUTINE_SELECT_LEGACY = "id, user_id, name, weight_unit, start_date, cycle_length_days";
const ROUTINE_SELECT_WITH_PROGRESSION = `${ROUTINE_SELECT_LEGACY}, default_progression_playbook_id, default_progression_playbook_config`;

export default async function EditDayAddExercisePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const user = await requireUser();
  const supabase = await supabaseServer();
  const accessResult = await loadAccessibleRoutineIdsForCurrentTier({
    supabase,
    userId: user.id,
  });
  if (accessResult.error || !accessResult.routineIds.has(params.id)) {
    notFound();
  }

  const { data: routineWithProgression, error: routineWithProgressionError } = await supabase
    .from("routines")
    .select(ROUTINE_SELECT_WITH_PROGRESSION)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  const { data: legacyRoutine } = routineWithProgressionError && isMissingRoutineDefaultProgressionColumnError(routineWithProgressionError)
    ? await supabase
        .from("routines")
        .select(ROUTINE_SELECT_LEGACY)
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single()
    : { data: null };
  const routine = routineWithProgression ?? legacyRoutine;
  if (!routine) notFound();

  const { data: day } = await loadRoutineDayWithWorkoutPlanCompat({
    supabase,
    routineDayId: params.dayId,
    routineId: params.id,
    userId: user.id,
  });
  if (!day) notFound();

  const { exercises, exerciseStats } = await loadExerciseChooserRouteData(user.id);
  const existingWorkoutPlanNames = await loadWorkoutPlanNames({
    supabase,
    userId: user.id,
  });
  const backHref = getRoutineDayEditHref(params.id, params.dayId);
  const dayLabel = formatRoutineDayDisplayName({
    name: day.name,
    dayIndex: day.day_index,
    startDate: routine.start_date ?? null,
  });

  return (
    <AddExerciseScaffold
      subtitle={formatAddExerciseSubtitle(dayLabel, routine.name)}
      backHref={backHref}
      backLabel="Back to day"
    >
      <EditDayAddExerciseScreen
        routineId={params.id}
        routineDayId={params.dayId}
        dayName={dayLabel}
        dayIndex={day.day_index}
        cycleLengthDays={(routine as RoutineRow).cycle_length_days}
        exercises={exercises}
        initialSelectedId={searchParams?.exerciseId}
        weightUnit={resolveAddExerciseWeightUnit(routine.weight_unit, "lbs")}
        defaultProgressionPlaybookId={(routine as RoutineRow).default_progression_playbook_id ?? null}
        defaultProgressionPlaybookConfig={(routine as RoutineRow).default_progression_playbook_config ?? null}
        addExerciseAction={addRoutineDayExerciseAction}
        resolveWorkoutPlanDecisionAction={resolveWorkoutPlanEditDecisionAction}
        loadWorkoutPlanDecisionStateAction={loadWorkoutPlanEditDecisionStateAction}
        exerciseStats={exerciseStats}
        backHref={backHref}
        workoutPlanId={day.workout_plan_template_id ?? null}
        requiresWorkoutPlanEditDecision={Boolean(day.workout_plan_template_edit_choice_required)}
        existingWorkoutPlanNames={existingWorkoutPlanNames}
      />
    </AddExerciseScaffold>
  );
}
