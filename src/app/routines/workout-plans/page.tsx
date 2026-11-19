import { cookies } from "next/headers";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { WorkoutPlansPageClient } from "@/app/routines/WorkoutPlansPageClient";
import { DaysLibraryScreen } from "@/app/routines/workout-plans/DaysLibraryScreen";
import { deleteWorkoutPlanSourceAction } from "@/app/routines/actions";
import { requireUser } from "@/lib/auth";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { ensureProfile } from "@/lib/profile";
import {
  filterQaLlelRows,
  QA_LLEL_VISIBILITY_COOKIE,
  resolveQaLlelVisibilityOverride,
  resolveShowQaLlelDataPreferenceWithOverride,
} from "@/lib/qa-data-visibility";
import { getRoutineDayEditHref, getRoutineHomeHref } from "@/lib/routine-day-navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { loadWorkoutPlanSourceList } from "@/lib/workout-plan-source-list";
import type { RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function WorkoutPlansPage() {
  const diagnostics = new LoadingDiagnosticsCollector("/routines/workout-plans");
  const user = await requireUser({
    gate: "workout-plans.auth.session",
    route: "/routines/workout-plans",
    blockingReason: "Waiting for authenticated session before loading days.",
    timeoutMs: 5000,
    collector: diagnostics,
  });
  const profile = await diagnostics.measure("workout-plans.profile.bootstrap", () => ensureProfile(user.id), {
    blockingReason: "Waiting for workout-plan profile bootstrap.",
    metadata: {
      userId: user.id,
    },
    timeoutMs: 5000,
  });
  const supabase = await supabaseServer();
  const showQaLlelData = resolveShowQaLlelDataPreferenceWithOverride(
    profile,
    resolveQaLlelVisibilityOverride((await cookies()).get(QA_LLEL_VISIBILITY_COOKIE)?.value),
  );

  const { data: routineRows } = await diagnostics.measure("workout-plans.routines.fetch", async () => await supabase
    .from("routines")
    .select("id, user_id, name, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false }), {
    blockingReason: "Waiting for workout-plan routine context.",
    metadata: {
      userId: user.id,
    },
    timeoutMs: 7000,
  });

  const routines = (routineRows ?? []) as Array<Pick<RoutineRow, "id" | "user_id" | "name" | "updated_at">>;
  const visibleRoutines = showQaLlelData
    ? routines
    : filterQaLlelRows(routines, (routine) => [routine.name]);
  const preferredRoutineId = visibleRoutines.find((routine) => routine.id === profile.active_routine_id)?.id
    ?? visibleRoutines[0]?.id
    ?? null;
  const workoutPlans = await loadWorkoutPlanSourceList({
    supabase,
    userId: user.id,
    routineId: preferredRoutineId ?? null,
  });
  const visibleWorkoutPlans = showQaLlelData
    ? workoutPlans
    : filterQaLlelRows(workoutPlans, (plan) => [plan.title, plan.sourceRoutineName]);
  const newWorkoutPlanHref = preferredRoutineId ? `/routines/${preferredRoutineId}/new-workout-plan` : null;
  return (
    <>
      <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
      <DaysLibraryScreen>
        <WorkoutPlansPageClient
          routinesHref="/routines"
          newWorkoutPlanHref={newWorkoutPlanHref}
          deleteWorkoutPlanSourceAction={deleteWorkoutPlanSourceAction}
          workoutPlans={visibleWorkoutPlans.map((plan) => ({
            ...plan,
            href: plan.sourceRoutineId && plan.sourceRoutineDayId
              ? getRoutineDayEditHref(plan.sourceRoutineId, plan.sourceRoutineDayId, getRoutineHomeHref(plan.sourceRoutineId))
              : null,
          }))}
        />
      </DaysLibraryScreen>
    </>
  );
}
