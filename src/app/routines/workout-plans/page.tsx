import { cookies } from "next/headers";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { RoutinesRouteHeaderCard } from "@/components/routines/RoutinesScreenFamily";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { HeaderInfoRail } from "@/components/ui/HeaderInfoRail";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { WorkoutPlansPageClient } from "@/app/routines/WorkoutPlansPageClient";
import { deleteWorkoutPlanSourceAction } from "@/app/routines/actions";
import { requireUser } from "@/lib/auth";
import type { HeaderInfoRailItem } from "@/lib/header-info-rail";
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

function buildWorkoutPlanLibraryInfoItems(args: {
  workoutPlanCount: number;
  autoProgressionCount: number;
  activeRoutineName?: string | null;
}): HeaderInfoRailItem[] {
  const items: HeaderInfoRailItem[] = [];

  if (args.activeRoutineName?.trim()) {
    items.push({
      id: "active-routine",
      label: "active",
      value: args.activeRoutineName.trim(),
      tone: "accent",
    });
  }

  items.push(
    {
      id: "workout-plan-count",
      label: "workout plans",
      value: args.workoutPlanCount,
      tone: "accent",
    },
    {
      id: "auto-progression-count",
      label: "auto",
      value: args.autoProgressionCount,
      tone: "success",
    },
  );

  return items;
}

export default async function WorkoutPlansPage() {
  const diagnostics = new LoadingDiagnosticsCollector("/routines/workout-plans");
  const user = await requireUser({
    gate: "workout-plans.auth.session",
    route: "/routines/workout-plans",
    blockingReason: "Waiting for authenticated session before loading workout plans.",
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
  const supabase = supabaseServer();
  const showQaLlelData = resolveShowQaLlelDataPreferenceWithOverride(
    profile,
    resolveQaLlelVisibilityOverride(cookies().get(QA_LLEL_VISIBILITY_COOKIE)?.value),
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
  const activeRoutineName = visibleRoutines.find((routine) => routine.id === preferredRoutineId)?.name ?? null;
  const workoutPlans = preferredRoutineId
    ? await loadWorkoutPlanSourceList({
        supabase,
        userId: user.id,
        routineId: preferredRoutineId,
      })
    : [];
  const visibleWorkoutPlans = showQaLlelData
    ? workoutPlans
    : filterQaLlelRows(workoutPlans, (plan) => [plan.title, plan.sourceRoutineName]);
  const newWorkoutPlanHref = preferredRoutineId ? `/routines/${preferredRoutineId}/new-workout-plan` : null;
  const headerInfoItems = buildWorkoutPlanLibraryInfoItems({
    workoutPlanCount: visibleWorkoutPlans.length,
    autoProgressionCount: visibleWorkoutPlans.reduce(
      (count, plan) => count + (
        plan.recapExercises?.filter((exercise) => {
          const label = exercise.progressionStateLabel?.trim().toLowerCase();
          return Boolean(label && label !== "manual");
        }).length ?? 0
      ),
      0,
    ),
    activeRoutineName,
  });

  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={(
          <ContentRail className="py-1">
            <RoutinesRouteHeaderCard
              title="Workout Plans"
              titleClassName="sr-only"
              subtitle={(
                <HeaderInfoRail
                  items={headerInfoItems}
                  ariaLabel="Workout plan library summary"
                  behavior="rotate-single"
                  className="justify-center text-center"
                />
              )}
            />
          </ContentRail>
        )}
      >
        <ContentRail className="space-y-3">
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
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
