import { notFound } from "next/navigation";
import { addRoutineDayExerciseAction } from "@/app/routines/[id]/edit/day/actions";
import { EditDayAddExerciseScreen } from "@/app/routines/[id]/edit/day/[dayId]/EditDayAddExerciseScreen";
import { ExerciseChooserRouteScaffold } from "@/components/exercises/ExerciseChooserScreenFamily";
import { RoutineDayHeaderTitle } from "@/components/ui/app/RoutineDayHeaderTitle";
import { appTokens } from "@/components/ui/app/tokens";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { loadExerciseChooserRouteData } from "@/lib/exercise-chooser-route-data";
import { getRoutineDayEditHref } from "@/lib/routine-day-navigation";
import { formatRoutineDayDisplayName } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
    dayId: string;
  };
  searchParams?: {
    exerciseId?: string;
  };
};

export default async function EditDayAddExercisePage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: routine } = await supabase
    .from("routines")
    .select("id, user_id, name, weight_unit, start_date")
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

  const { exercises, exerciseStats } = await loadExerciseChooserRouteData(user.id);
  const backHref = getRoutineDayEditHref(params.id, params.dayId);
  const dayLabel = formatRoutineDayDisplayName({
    name: day.name,
    dayIndex: day.day_index,
    startDate: routine.start_date ?? null,
  });

  return (
    <ExerciseChooserRouteScaffold
      recipe="editDay"
      title={(
        <RoutineDayHeaderTitle
          leadingItems={["Add Exercise to", routine.name]}
          dayLabel={dayLabel}
        />
      )}
      backHref={backHref}
      backAriaLabel="Back to Edit Day"
      headerAlign="center"
      floatingHeaderRailClassName={cn(appTokens.historyFloatingHeaderRail, "relative z-30 pointer-events-auto")}
      backButtonClassName="relative z-30 pointer-events-auto"
    >
      <EditDayAddExerciseScreen
        routineId={params.id}
        routineDayId={params.dayId}
        exercises={exercises}
        initialSelectedId={searchParams?.exerciseId}
        weightUnit={routine.weight_unit}
        addExerciseAction={addRoutineDayExerciseAction}
        exerciseStats={exerciseStats}
        backHref={backHref}
      />
    </ExerciseChooserRouteScaffold>
  );
}
