import { ExerciseBrowserClient } from "@/app/history/exercises/ExerciseBrowserClient";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { getExercisesWithStatsForExplicitUser } from "@/lib/exercises-browser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function ErrorState({ message }: { message: string }) {
  return (
    <main className="app-page-scroll min-h-[100dvh] px-4 py-6">
      <div className="mx-auto max-w-md rounded-[28px] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.9)] px-4 py-5 text-sm text-[rgb(var(--text)/0.92)]">
        {message}
      </div>
    </main>
  );
}

export default async function DevHistoryExercisesShotPage({
  searchParams,
}: {
  searchParams?: {
    userId?: string;
    view?: string;
    filters?: string;
  };
}) {
  if (process.env.NODE_ENV === "production") {
    return <ErrorState message="Not found." />;
  }

  const userId = searchParams?.userId?.trim() ?? "";
  const initialViewMode = searchParams?.view === "detailed" ? "detailed" : "compact";
  const initialFiltersOpen = searchParams?.filters === "open";

  if (!userId) {
    return <ErrorState message="Missing user id." />;
  }

  const rows = (await getExercisesWithStatsForExplicitUser(userId, supabaseAdmin())).slice(0, 6);

  return (
    <HistoryRouteScaffold
      mode="overview"
      title="Exercises"
      activeTab="exercises"
      headerChrome="controlsOnly"
      floatingHeaderSlot={<div id="history-exercises-floating-header" />}
    >
      <ExerciseBrowserClient
        rows={rows}
        initialViewMode={initialViewMode}
        initialFiltersOpen={initialFiltersOpen}
      />
    </HistoryRouteScaffold>
  );
}
