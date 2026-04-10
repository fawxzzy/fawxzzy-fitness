import { notFound } from "next/navigation";
import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { ContentRail } from "@/components/layout/ContentRail";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { addRoutineDayExerciseAction } from "@/app/routines/[id]/edit/day/actions";
import { EditDayAddExerciseScreen } from "@/app/routines/[id]/edit/day/[dayId]/EditDayAddExerciseScreen";
import { requireUser } from "@/lib/auth";
import { listExercises } from "@/lib/exercises";
import { mapExerciseStatsForPicker } from "@/lib/exercise-picker-stats";
import { getExerciseStatsForExercises } from "@/lib/exercise-stats";
import { getRoutineDayEditHref } from "@/lib/routine-day-navigation";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
    dayId: string;
  };
};

export default async function EditDayAddExercisePage({ params }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: routine } = await supabase
    .from("routines")
    .select("id, user_id, name, weight_unit")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  if (!routine) notFound();

  const { data: day } = await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name")
    .eq("id", params.dayId)
    .eq("routine_id", params.id)
    .eq("user_id", user.id)
    .single();
  if (!day) notFound();

  const exerciseOptions = await listExercises();
  const exerciseStatsByExerciseId = await getExerciseStatsForExercises(user.id, exerciseOptions.map((exercise) => exercise.id));
  const backHref = getRoutineDayEditHref(params.id, params.dayId);

  return (
    <AppShell topNavMode="none" className="h-[100dvh]">
      <ScrollScreenWithBottomActions
        floatingHeader={(
          <ContentRail className="py-1">
            <ScreenScaffold recipe="editDay" className="w-full">
              <RoutineEditorPageHeader
                title="Add Exercise"
                action={<TopRightBackButton href={backHref} ariaLabel="Back to Edit Day" historyBehavior="fallback-only" />}
              />
            </ScreenScaffold>
          </ContentRail>
        )}
      >
        <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
          <ScreenScaffold recipe="editDay" className="w-full">
            <EditDayAddExerciseScreen
              routineId={params.id}
              routineDayId={params.dayId}
              exercises={exerciseOptions}
              weightUnit={routine.weight_unit}
              addExerciseAction={addRoutineDayExerciseAction}
              exerciseStats={mapExerciseStatsForPicker(exerciseOptions, exerciseStatsByExerciseId)}
              backHref={backHref}
            />
          </ScreenScaffold>
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
