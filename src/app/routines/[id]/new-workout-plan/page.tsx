import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { RoutinesRouteHeaderCard } from "@/components/routines/RoutinesScreenFamily";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { CreateRoutineDayClient } from "@/app/routines/CreateRoutineDayClient";
import { createRoutineDayAction, populateRoutineDayFromSourceAction } from "@/app/routines/actions";
import { requireUser } from "@/lib/auth";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { formatRoutineDayStableDisplayName, getRoutineDayResolvedWeekdayLabel } from "@/lib/routines";
import { getRoutineDayEditHref, getRoutineEditHref, getRoutineHomeHref } from "@/lib/routine-day-navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { loadWorkoutPlanSourceList } from "@/lib/workout-plan-source-list";
import type { RoutineDayRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ targetDayId?: string }>;
};

export default async function CreateWorkoutPlanPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const targetDayId = String(resolvedSearchParams?.targetDayId ?? "").trim();
  const isTargetMode = targetDayId.length > 0;
  const diagnostics = new LoadingDiagnosticsCollector(`/routines/${id}/new-workout-plan`);
  const user = await requireUser({
    gate: "routine-day-create.auth.session",
    route: `/routines/${id}/new-workout-plan`,
    blockingReason: "Waiting for authenticated session before loading the workout-plan creator.",
    timeoutMs: 5000,
    collector: diagnostics,
  });
  const supabase = supabaseServer();

  const { data: routineData } = await diagnostics.measure("routine-day-create.routine.fetch", async () => await supabase
    .from("routines")
    .select("id, user_id, name, start_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle(), {
    blockingReason: "Waiting for routine metadata.",
    metadata: {
      routineId: id,
      userId: user.id,
    },
    timeoutMs: 7000,
  });

  if (!routineData) {
    notFound();
  }

  const { data: routineDaysData } = await diagnostics.measure("routine-day-create.days.fetch", async () => await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("routine_id", routineData.id)
    .eq("user_id", user.id)
    .order("day_index", { ascending: true }), {
    blockingReason: "Waiting for workout-plan source days.",
    metadata: {
      routineId: id,
      userId: user.id,
    },
    timeoutMs: 7000,
  });

  const routineDays = (routineDaysData ?? []) as RoutineDayRow[];
  const targetDay = isTargetMode
    ? routineDays.find((day) => day.id === targetDayId && day.routine_id === routineData.id)
    : null;
  if (isTargetMode && !targetDay) {
    notFound();
  }
  const workoutPlanSources = await loadWorkoutPlanSourceList({
    supabase,
    userId: user.id,
    routineId: routineData.id,
    excludeDayId: targetDayId || null,
  });

  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={(
          <ContentRail className="py-1">
            <RoutinesRouteHeaderCard
              title={isTargetMode ? "Choose Workout Plan" : "Create Workout Plan"}
              subtitle={(
                <span className="text-center">
                  {isTargetMode
                    ? <>Duplicate a source workout plan into <span className="font-semibold text-[rgb(var(--text-primary))]">{formatRoutineDayStableDisplayName({
                        name: targetDay?.name ?? null,
                        dayIndex: targetDay?.day_index ?? 1,
                        startDate: routineData.start_date,
                      })}</span> for <span className="font-semibold text-[rgb(var(--text-primary))]">{routineData.name}</span>.</>
                    : <>Build the next workout plan for <span className="font-semibold text-[rgb(var(--text-primary))]">{routineData.name}</span>, then continue into the workout-plan editor.</>}
                </span>
              )}
            />
          </ContentRail>
        )}
      >
        <ContentRail className="space-y-3">
          <CreateRoutineDayClient
            routineId={routineData.id}
            backHref={isTargetMode && targetDay
              ? getRoutineDayEditHref(routineData.id, targetDay.id, getRoutineHomeHref(routineData.id))
              : getRoutineHomeHref(routineData.id)}
            routineEditHref={getRoutineEditHref(routineData.id)}
            createRoutineDayAction={createRoutineDayAction}
            populateRoutineDayFromSourceAction={populateRoutineDayFromSourceAction}
            targetRoutineDayId={targetDay?.id}
            targetDayEditHref={targetDay
              ? getRoutineDayEditHref(routineData.id, targetDay.id, getRoutineHomeHref(routineData.id))
              : undefined}
            days={workoutPlanSources}
          />
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
