import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AppRow } from "@/components/ui/app/AppRow";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { requireUser } from "@/lib/auth";
import { getExerciseNameMap } from "@/lib/exercises";
import { formatRepTarget } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
    dayId: string;
  };
};

function formatTargetSummary(exercise: RoutineDayExerciseRow) {
  const parts: string[] = [];

  if (exercise.target_sets !== null) {
    parts.push(`${exercise.target_sets} sets`);
  }

  const repsText = formatRepTarget(exercise.target_reps_min, exercise.target_reps_max, exercise.target_reps ?? null).replace("Reps: ", "");
  if (repsText !== "-") {
    parts.push(`${repsText} reps`);
  }

  return parts.join(" · ");
}

export default async function RoutineDayDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: routine } = await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at, weight_unit")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!routine) {
    notFound();
  }

  const { data: day } = await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("id", params.dayId)
    .eq("routine_id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!day) {
    notFound();
  }

  const { data: exercises } = await supabase
    .from("routine_day_exercises")
    .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, notes")
    .eq("routine_day_id", day.id)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const routineRow = routine as RoutineRow;
  const dayRow = day as RoutineDayRow;
  const dayExercises = (exercises ?? []) as RoutineDayExerciseRow[];
  const exerciseNameMap = await getExerciseNameMap();
  const dayLabel = dayRow.name?.trim() || (dayRow.is_rest ? "Rest" : "Training");

  return (
    <section className="space-y-4">
      <AppNav />

      <AppPanel className="space-y-3">
        <AppHeader
          title={dayLabel}
          subtitleLeft={`Day ${dayRow.day_index} • ${routineRow.name}`}
          action={<TopRightBackButton href="/routines" />}
        />

        {dayRow.is_rest || dayExercises.length === 0 ? (
          <p className="rounded-lg border border-border/45 bg-surface/52 px-3 py-3 text-sm text-muted">
            Rest day. No exercises planned for this day.
          </p>
        ) : (
          <ul className="space-y-2">
            {dayExercises.map((exercise) => {
              const exerciseName = exerciseNameMap.get(exercise.exercise_id) ?? exercise.exercise_id;
              const targetSummary = formatTargetSummary(exercise);

              return (
                <li key={exercise.id}>
                  <AppRow leftTop={exerciseName} leftBottom={targetSummary || undefined} />
                </li>
              );
            })}
          </ul>
        )}
      </AppPanel>
    </section>
  );
}
