import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { quickAddExerciseAction } from "@/app/session/[id]/actions";
import { SessionQuickAddExerciseForm } from "@/app/session/[id]/SessionQuickAddExerciseForm";
import { getSessionPageData } from "@/app/session/[id]/queries";
import { mapExerciseStatsForPicker } from "@/lib/exercise-picker-stats";
import { formatAddExerciseHeaderSubtitle } from "@/lib/header-meta";
import { isSafeAppPath } from "@/lib/navigation-return";

type PageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    returnTo?: string;
  };
};

export default async function SessionAddExercisePage({ params, searchParams }: PageProps) {
  const {
    sessionRow,
    routine,
    exerciseOptions,
    exerciseStatsByExerciseId,
  } = await getSessionPageData(params.id);

  const backHref = isSafeAppPath(searchParams?.returnTo)
    ? searchParams?.returnTo
    : `/session/${params.id}`;

  return (
    <AppShell topNavMode="none" className="h-[100dvh]">
      <ScrollScreenWithBottomActions className="px-4 pb-0">
        <ScreenScaffold recipe="sessionAddExercise" className="mx-auto w-full max-w-md">
          <RoutineEditorPageHeader
            recipe="sessionAddExercise"
            eyebrow="Current Session"
            title="Add Exercise"
            subtitle={formatAddExerciseHeaderSubtitle(routine?.name ?? (sessionRow.name || "Workout"))}
            action={<TopRightBackButton href={backHref} ariaLabel="Back to session" historyBehavior="fallback-only" />}
          />

          <SessionQuickAddExerciseForm
            sessionId={params.id}
            exercises={exerciseOptions}
            weightUnit={routine?.weight_unit ?? "kg"}
            exerciseStats={mapExerciseStatsForPicker(exerciseOptions, exerciseStatsByExerciseId)}
            backHref={backHref}
            quickAddExerciseAction={quickAddExerciseAction}
          />
        </ScreenScaffold>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
