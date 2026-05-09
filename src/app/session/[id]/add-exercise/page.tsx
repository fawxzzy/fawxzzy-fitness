import { appTokens } from "@/components/ui/app/tokens";
import { addExerciseAction } from "@/app/session/[id]/actions";
import { SessionQuickAddExerciseForm } from "@/app/session/[id]/SessionQuickAddExerciseForm";
import { ExerciseChooserRouteScaffold } from "@/components/exercises/ExerciseChooserScreenFamily";
import { RoutineDayHeaderTitle } from "@/components/ui/app/RoutineDayHeaderTitle";
import { cn } from "@/lib/cn";
import { loadExerciseChooserRouteData } from "@/lib/exercise-chooser-route-data";
import { getSessionPageData } from "@/app/session/[id]/queries";
import { isSafeAppPath } from "@/lib/navigation-return";
import type { RoutineRow } from "@/types/db";

type PageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    returnTo?: string;
    exerciseId?: string;
  };
};

export default async function SessionAddExercisePage({ params, searchParams }: PageProps) {
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
    <ExerciseChooserRouteScaffold
      recipe="sessionAddExercise"
      title={(
        <RoutineDayHeaderTitle
          leadingItems={["Add Exercise to", routine?.name ?? sessionRow.name]}
          dayLabel={dayName}
        />
      )}
      backHref={backHref}
      backAriaLabel="Back to session"
      headerAlign="center"
      floatingHeaderRailClassName={cn(appTokens.historyFloatingHeaderRail, "relative z-30 pointer-events-auto")}
      backButtonClassName="relative z-30 pointer-events-auto"
    >
      <SessionQuickAddExerciseForm
        sessionId={params.id}
        exercises={exercises}
        initialSelectedId={searchParams?.exerciseId}
        weightUnit={routine?.weight_unit ?? "kg"}
        defaultProgressionPlaybookId={(routine as RoutineRow | null)?.default_progression_playbook_id ?? null}
        defaultProgressionPlaybookConfig={(routine as RoutineRow | null)?.default_progression_playbook_config ?? null}
        exerciseStats={exerciseStats}
        backHref={backHref}
        addExerciseAction={addExerciseAction}
      />
    </ExerciseChooserRouteScaffold>
  );
}
