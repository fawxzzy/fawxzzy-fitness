import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";
import { AppNav } from "@/components/AppNav";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { HistoryPageHeader } from "@/components/history/HistoryShared";
import { getExercisesWithStatsForUser } from "@/lib/exercises-browser";
import { ExerciseBrowserClient } from "./ExerciseBrowserClient";

export const dynamic = "force-dynamic";

function ExercisesBrowserError() {
  return (
    <AppPanel className="space-y-3 p-4">
      <p className="text-sm font-medium text-slate-100">Unable to load exercise history right now.</p>
      <p className="text-xs text-slate-300">Please try again in a moment.</p>
    </AppPanel>
  );
}

export default async function HistoryExercisesPage() {
  try {
    const rows = await getExercisesWithStatsForUser();

    return (
      <MainTabScreen>
        <AppNav />

        <ScrollScreenWithBottomActions className="px-1">
          <div className="flex min-h-0 flex-1 flex-col gap-3 py-1">
            <HistoryPageHeader title="EXERCISES" />
            <ExerciseBrowserClient rows={rows} />
          </div>
        </ScrollScreenWithBottomActions>
      </MainTabScreen>
    );
  } catch (error) {
    if (isRedirectError(error) || isNotFoundError(error)) {
      throw error;
    }

    console.error("[history/exercises] failed to load exercise stats", error);

    return (
      <MainTabScreen>
        <AppNav />
        <ScrollScreenWithBottomActions className="px-1">
          <ExercisesBrowserError />
        </ScrollScreenWithBottomActions>
      </MainTabScreen>
    );
  }
}
