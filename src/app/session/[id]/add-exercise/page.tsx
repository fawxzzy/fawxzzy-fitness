import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { appTokens } from "@/components/ui/app/tokens";
import { quickAddExerciseAction } from "@/app/session/[id]/actions";
import { SessionQuickAddExerciseForm } from "@/app/session/[id]/SessionQuickAddExerciseForm";
import { getSessionPageData } from "@/app/session/[id]/queries";
import { mapExerciseStatsForPicker } from "@/lib/exercise-picker-stats";
import { isSafeAppPath } from "@/lib/navigation-return";
import { formatTodayHeaderTitle } from "@/lib/today-page-state";

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
    exerciseOptions,
    exerciseStatsByExerciseId,
  } = await getSessionPageData(params.id);

  const backHref = isSafeAppPath(searchParams?.returnTo)
    ? searchParams?.returnTo
    : `/session/${params.id}`;
  const dayName = sessionRow.routine_day_name?.trim()
    || (sessionRow.routine_day_index ? `Day ${sessionRow.routine_day_index}` : null);
  const headerTitle = `Add Exercise to ${formatTodayHeaderTitle(routine?.name ?? sessionRow.name, dayName)}`;

  return (
    <AppShell topNavMode="none" className="h-[100dvh]" ambientPreset="logSet">
      <ScrollScreenWithBottomActions
        floatingHeader={(
          <ContentRail className={`${appTokens.historyFloatingHeaderRail} relative z-30 pointer-events-auto`}>
            <ScreenScaffold recipe="sessionAddExercise" className="w-full">
              <RoutineEditorPageHeader
                recipe="sessionAddExercise"
                title={headerTitle}
                align="center"
                action={<TopRightBackButton href={backHref} ariaLabel="Back to session" historyBehavior="fallback-only" className="relative z-30 pointer-events-auto" />}
              />
            </ScreenScaffold>
          </ContentRail>
        )}
      >
        <ContentRail className={appTokens.currentSessionContentRail}>
          <ScreenScaffold recipe="sessionAddExercise" className="w-full">
            <SessionQuickAddExerciseForm
              sessionId={params.id}
              exercises={exerciseOptions}
              initialSelectedId={searchParams?.exerciseId}
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
