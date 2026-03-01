import { AppNav } from "@/components/AppNav";
import { BackButton } from "@/components/ui/BackButton";
import { Glass } from "@/components/ui/Glass";
import { getExercisesWithStatsForUser } from "@/lib/exercises-browser";
import { ExerciseBrowserClient } from "./ExerciseBrowserClient";

export const dynamic = "force-dynamic";

export default async function HistoryExercisesPage() {
  const rows = await getExercisesWithStatsForUser();

  return (
    <section className="space-y-4">
      <AppNav />

      <Glass variant="base" className="space-y-2 p-3" interactive={false}>
        <BackButton href="/history" label="Back" className="w-fit" />
        <ExerciseBrowserClient rows={rows} />
      </Glass>
    </section>
  );
}
