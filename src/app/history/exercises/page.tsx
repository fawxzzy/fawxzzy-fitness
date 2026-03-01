import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";
import { AppNav } from "@/components/AppNav";
import { Glass } from "@/components/ui/Glass";
import { getExercisesWithStatsForUser } from "@/lib/exercises-browser";
import { ExerciseBrowserClient } from "./ExerciseBrowserClient";

export const dynamic = "force-dynamic";

function ExercisesBrowserError() {
  return (
    <Glass variant="base" className="space-y-3 p-4" interactive={false}>
      <p className="text-sm font-medium text-slate-100">Unable to load exercise history right now.</p>
      <p className="text-xs text-slate-300">Please try again in a moment.</p>
    </Glass>
  );
}

export default async function HistoryExercisesPage() {
  try {
    const rows = await getExercisesWithStatsForUser();

    return (
      <section className="space-y-4">
        <AppNav />

        <Glass variant="base" className="p-3" interactive={false}>
          <ExerciseBrowserClient rows={rows} />
        </Glass>
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
