import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { quickAddExerciseAction } from "@/app/session/[id]/actions";
import { SessionQuickAddExerciseForm } from "@/app/session/[id]/SessionQuickAddExerciseForm";
import { getSessionPageData } from "@/app/session/[id]/queries";
import { mapExerciseStatsForPicker } from "@/lib/exercise-picker-stats";
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
    routine,
    exerciseOptions,
    exerciseStatsByExerciseId,
  } = await getSessionPageData(params.id);

  const backHref = isSafeAppPath(searchParams?.returnTo)
    ? searchParams?.returnTo
    : `/session/${params.id}`;

  return (
    <AppShell topNavMode="none" className="h-[100dvh]" ambientPreset="logSet">
      <ScrollScreenWithBottomActions
        floatingHeader={(
          <ContentRail className="py-1">
            <ScreenScaffold recipe="sessionAddExercise" className="w-full">
              <RoutineEditorPageHeader
                recipe="sessionAddExercise"
                title="Add Exercise"
                action={<TopRightBackButton href={backHref} ariaLabel="Back to session" historyBehavior="fallback-only" />}
              />
            </ScreenScaffold>
          </ContentRail>
        )}
      >
        <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
          <ScreenScaffold recipe="sessionAddExercise" className="w-full">
            <SessionQuickAddExerciseForm
              sessionId={params.id}
              exercises={exerciseOptions}
              weightUnit={routine?.weight_unit ?? "kg"}
              exerciseStats={mapExerciseStatsForPicker(exerciseOptions, exerciseStatsByExerciseId)}
              backHref={backHref}
              quickAddExerciseAction={quickAddExerciseAction}
            />
          </ScreenScaffold>
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
