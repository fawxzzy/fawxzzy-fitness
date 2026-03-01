import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";
import { AppNav } from "@/components/AppNav";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
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
      <section className="flex h-[100dvh] min-h-0 flex-col gap-4 overflow-hidden">
        <AppNav />

        <div className="flex min-h-0 flex-1 flex-col">
          <AppPanel className="flex min-h-0 flex-1 flex-col gap-3 p-3">
            <AppHeader title="History" subtitleLeft="Completed sessions and exercise performance" />
            <ExerciseBrowserClient rows={rows} />
          </AppPanel>
        </div>
      </section>
    );
  } catch (error) {
    if (isRedirectError(error) || isNotFoundError(error)) {
      throw error;
    }

    console.error("[history/exercises] failed to load exercise stats", error);

    return (
      <section className="space-y-4">
        <AppNav />
        <ExercisesBrowserError />
      </section>
    );
  }
}
