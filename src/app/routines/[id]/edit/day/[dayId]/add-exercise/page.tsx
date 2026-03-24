import { notFound } from "next/navigation";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { SubtitleText, TitleText } from "@/components/ui/text-roles";
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
      <ScrollScreenWithBottomActions className="px-4 pb-0 pt-0">
        <section className="mx-auto w-full max-w-md space-y-3 pb-4 pt-0">
          <AppPanel className="space-y-1 p-4">
            <TitleText as="h1" className="text-base">Add Exercise</TitleText>
            <SubtitleText>{routine.name} · {day.name}</SubtitleText>
          </AppPanel>

          <EditDayAddExerciseScreen
            routineId={params.id}
            routineDayId={params.dayId}
            exercises={exerciseOptions}
            weightUnit={routine.weight_unit}
            addExerciseAction={addRoutineDayExerciseAction}
            exerciseStats={mapExerciseStatsForPicker(exerciseOptions, exerciseStatsByExerciseId)}
            backHref={backHref}
          />
        </section>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
