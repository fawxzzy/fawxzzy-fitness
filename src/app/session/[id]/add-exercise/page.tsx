import { addExerciseAction } from "@/app/session/[id]/actions";
import { SessionQuickAddExerciseForm } from "@/app/session/[id]/SessionQuickAddExerciseForm";
import { AddExerciseScaffold } from "@/components/exercises/AddExerciseScaffold";
import { formatAddExerciseSubtitle } from "@/lib/header-meta";
import { loadExerciseChooserRouteData } from "@/lib/exercise-chooser-route-data";
import { getSessionPageData } from "@/app/session/[id]/queries";
import { isSafeAppPath } from "@/lib/navigation-return";
import type { RoutineRow } from "@/types/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    returnTo?: string;
    exerciseId?: string;
  }>;
};

export default async function SessionAddExercisePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const {
    routine,
    sessionRow,
  } = await getSessionPageData(params.id);
  const { exercises, exerciseStats } = await loadExerciseChooserRouteData(sessionRow.user_id);

  const backHref = isSafeAppPath(searchParams?.returnTo)
    ? searchParams?.returnTo
    : `/session/${params.id}`;
  const dayName = sessionRow.routine_day_name?.trim()
    || (sessionRow.routine_day_index ? `Day ${sessionRow.routine_day_index}` : null);

  return (
    <AddExerciseScaffold
      recipe="sessionAddExercise"
      subtitle={formatAddExerciseSubtitle(dayName, routine?.name ?? sessionRow.name)}
      backHref={backHref}
      backLabel="Back to workout"
    >
      <SessionQuickAddExerciseForm
        sessionId={params.id}
        exercises={exercises}
        initialSelectedId={searchParams?.exerciseId}
        weightUnit={routine?.weight_unit === "lbs" ? "lbs" : "kg"}
        defaultProgressionPlaybookId={(routine as RoutineRow | null)?.default_progression_playbook_id ?? null}
        defaultProgressionPlaybookConfig={(routine as RoutineRow | null)?.default_progression_playbook_config ?? null}
        exerciseStats={exerciseStats}
        backHref={backHref}
        addExerciseAction={addExerciseAction}
      />
    </AddExerciseScaffold>
  );
}
