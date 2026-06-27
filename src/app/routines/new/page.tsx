import { cookies } from "next/headers";
import { RoutineDetailsScreenShell } from "@/components/routines/RoutineEditorShared";
import { NewRoutineDraftForm } from "@/app/routines/new/NewRoutineDraftForm";
import { RoutineHomeEditorClient } from "@/app/routines/RoutineHomeEditorClient";
import { appendRoutineDayAction, createRoutineDayAction, deleteRoutineDayAction, reorderRoutineDaysAction } from "@/app/routines/actions";
import { requireUser } from "@/lib/auth";
import { getRestDayExerciseCountSummaryFromCanonicalDayOrFallback } from "@/lib/day-summary";
import { ensureProfile } from "@/lib/profile";
import { buildRoutinePlanRecapExercises } from "@/lib/routine-plan-preview";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import {
  ROUTINE_DRAFT_COOKIE_NAME,
  ROUTINE_PENDING_WORKOUT_PLAN_CHOOSER_DAY_INDEX_COOKIE_NAME,
} from "@/lib/routine-draft-session";
import {
  getCurrentCycleOccurrenceContext,
  getRoutineDayResolvedWeekdayLabel,
  getRoutineStartWeekdayFromDate,
  ROUTINE_START_WEEKDAYS,
  getTimeZoneDayWindow,
  getTodayDateInTimeZone,
  resolveCompletedRoutineDayIndexesForOccurrence,
  resolveRoutineScheduleForToday,
} from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { normalizeRoutineTimezone } from "@/lib/timezones";
import { loadWorkoutPlanTemplateNames } from "@/lib/workout-plan-templates";
import { loadWorkoutPlanSourceList } from "@/lib/workout-plan-source-list";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

const ROUTINE_SELECT = "id, user_id, name, cycle_length_days, schedule_mode, start_date, timezone, weight_unit, default_progression_playbook_id, default_progression_playbook_config";
const ROUTINE_DAY_EXERCISE_SELECT = "id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config";

export default async function NewRoutinePage({
  searchParams,
}: {
  searchParams?: Promise<{ openWorkoutPlanChooserDayIndex?: string }>;
}) {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const routineTimezoneDefault = normalizeRoutineTimezone(profile.timezone);
  const routineStartDateDefault = getTodayDateInTimeZone(routineTimezoneDefault);
  const supabase = supabaseServer();
  const { data: existingRoutineRows } = await supabase
    .from("routines")
    .select("name")
    .eq("user_id", user.id);
  const existingTemplateNames = await loadWorkoutPlanTemplateNames({
    supabase,
    userId: user.id,
  });
  const cookieStore = cookies();
  const draftRoutineId = cookieStore.get(ROUTINE_DRAFT_COOKIE_NAME)?.value?.trim() || null;
  const pendingWorkoutPlanChooserDayIndex = Number.parseInt(
    cookieStore.get(ROUTINE_PENDING_WORKOUT_PLAN_CHOOSER_DAY_INDEX_COOKIE_NAME)?.value?.trim() || "",
    10,
  );
  const resolvedSearchParams = await searchParams;
  const openWorkoutPlanChooserDayIndex = Number.parseInt(String(resolvedSearchParams?.openWorkoutPlanChooserDayIndex ?? ""), 10);

  if (draftRoutineId) {
    const { data: draftRoutineData } = await supabase
      .from("routines")
      .select(ROUTINE_SELECT)
      .eq("id", draftRoutineId)
      .eq("user_id", user.id)
      .maybeSingle();

    const draftRoutine = (draftRoutineData ?? null) as RoutineRow | null;
    if (draftRoutine) {
      const { data: routineDaysData } = await supabase
        .from("routine_days")
        .select("id, user_id, routine_id, day_index, name, is_rest, notes")
        .eq("routine_id", draftRoutine.id)
        .eq("user_id", user.id);
      const routineDays = (routineDaysData ?? []) as RoutineDayRow[];
      const sortedRoutineDays = routineDays
        .map((day, index) => ({ day, index }))
        .sort((a, b) => {
          const left = Number.isFinite(a.day.day_index) ? a.day.day_index : null;
          const right = Number.isFinite(b.day.day_index) ? b.day.day_index : null;

          if (left !== null && right !== null) {
            return left - right;
          }

          if (left !== null) {
            return -1;
          }

          if (right !== null) {
            return 1;
          }

          return a.index - b.index;
        })
        .map(({ day }) => day);

      const { data: routineDayExercisesData } = sortedRoutineDays.length > 0
        ? await supabase
          .from("routine_day_exercises")
          .select(ROUTINE_DAY_EXERCISE_SELECT)
          .in("routine_day_id", sortedRoutineDays.map((day) => day.id))
          .eq("user_id", user.id)
        : { data: [] };
      const routineDayExercises = (routineDayExercisesData ?? []) as RoutineDayExerciseRow[];

      const { summaries } = sortedRoutineDays.length > 0
        ? await buildCanonicalDaySummaries({
          supabase,
          routineDays: sortedRoutineDays,
          allDayExercises: routineDayExercises,
        })
        : { summaries: [] };
      const exerciseSummaryByDayId = new Map(
        summaries.map((summary) => [
          summary.day.id,
          getRestDayExerciseCountSummaryFromCanonicalDayOrFallback(summary, Boolean(summary.day.is_rest)),
        ]),
      );
      const canonicalSummaryByDayId = new Map(
        summaries.map((summary) => [summary.day.id, summary]),
      );

      const cycleLength = draftRoutine.cycle_length_days ?? sortedRoutineDays.length;
      const routineTimeZone = draftRoutine.timezone || profile.timezone;
      const todayRoutineSchedule = draftRoutine.start_date && cycleLength > 0
        ? resolveRoutineScheduleForToday({
          cycleLengthDays: cycleLength,
          scheduleMode: draftRoutine.schedule_mode,
          startDate: draftRoutine.start_date,
          startWeekday: getRoutineStartWeekdayFromDate(draftRoutine.start_date),
          profileTimeZone: routineTimeZone,
        })
        : null;
      const todayRoutineDayIndex = todayRoutineSchedule?.dayIndex ?? null;
      const todayRowIndex = todayRoutineDayIndex === null
        ? -1
        : sortedRoutineDays.findIndex((day, index) => {
          const dayNumber = Number.isFinite(day.day_index) ? day.day_index : index + 1;
          return dayNumber === todayRoutineDayIndex;
        });

      let completedDayIndexSet = new Set<number>();
      let skippedDayIndexSet = new Set<number>();
      let inSessionDayIndex: number | null = null;
      const safeCycleLength = Number.isFinite(cycleLength) && cycleLength > 0 ? Math.floor(cycleLength) : 1;

      if (draftRoutine.start_date && todayRoutineSchedule?.resolution.status === "scheduled" && todayRoutineSchedule.dayIndex !== null) {
        const todayDate = todayRoutineSchedule.todayDate;
        const dayIndexes = sortedRoutineDays.map((day, index) => (
          Number.isFinite(day.day_index) ? day.day_index : index + 1
        ));
        const { occurrenceDateByDayIndex, queryStartDate, queryEndDate } = getCurrentCycleOccurrenceContext({
          cycleLengthDays: safeCycleLength,
          startDate: draftRoutine.start_date,
          profileTimeZone: routineTimeZone,
          dayIndexes,
          referenceDate: todayDate,
        });
        const { data: completedCycleSessions } = await supabase
          .from("sessions")
          .select("routine_day_index, performed_at")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .eq("routine_id", draftRoutine.id)
          .gte("performed_at", `${queryStartDate}T00:00:00.000Z`)
          .lt("performed_at", `${queryEndDate}T00:00:00.000Z`);

        completedDayIndexSet = new Set(resolveCompletedRoutineDayIndexesForOccurrence({
          sessions: completedCycleSessions ?? [],
          occurrenceDateByDayIndex,
          timeZone: routineTimeZone,
        }));

        skippedDayIndexSet = new Set(
          sortedRoutineDays
            .map((day, index) => ({
              day,
              dayNumber: Number.isFinite(day.day_index) ? day.day_index : index + 1,
            }))
            .filter(({ day, dayNumber }) => {
              const occurrenceDate = occurrenceDateByDayIndex.get(dayNumber);
              return Boolean(
                occurrenceDate
                && occurrenceDate < todayDate
                && !day.is_rest
                && !completedDayIndexSet.has(dayNumber),
              );
            })
            .map(({ dayNumber }) => dayNumber),
        );
      } else {
        const { startIso, endIso } = getTimeZoneDayWindow(routineTimeZone);
        const { data: completedTodaySessions } = await supabase
          .from("sessions")
          .select("routine_day_index")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .eq("routine_id", draftRoutine.id)
          .gte("performed_at", startIso)
          .lt("performed_at", endIso);

        completedDayIndexSet = new Set(
          (completedTodaySessions ?? [])
            .map((session) => session.routine_day_index)
            .filter((value): value is number => Number.isFinite(value)),
        );
      }

      const { data: inProgressSession } = await supabase
        .from("sessions")
        .select("id, routine_day_index")
        .eq("user_id", user.id)
        .eq("routine_id", draftRoutine.id)
        .eq("status", "in_progress")
        .order("performed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const resolvedInProgressDayIndex = inProgressSession?.routine_day_index;
      inSessionDayIndex = Number.isFinite(resolvedInProgressDayIndex) ? resolvedInProgressDayIndex : null;
      const workoutPlanSources = await loadWorkoutPlanSourceList({
        supabase,
        userId: user.id,
        routineId: draftRoutine.id,
      });

      return (
        <RoutineDetailsScreenShell
          backHref="/routines"
          title="New Routine"
          align="center"
        >
          <RoutineHomeEditorClient
            routineId={draftRoutine.id}
            existingStartDate={draftRoutine.start_date ?? ""}
            name={draftRoutine.name}
            cycleLengthDays={draftRoutine.cycle_length_days}
            scheduleMode={draftRoutine.schedule_mode === "rolling_n_day" ? "rolling_n_day" : "weekday_anchored"}
            startDate={draftRoutine.start_date ?? ""}
            startWeekday={getRoutineStartWeekdayFromDate(draftRoutine.start_date) ?? ROUTINE_START_WEEKDAYS[0]}
            timezone={routineTimeZone}
            weightUnit={draftRoutine.weight_unit ?? "lbs"}
            distanceUnit={profile.preferred_distance_unit ?? "mi"}
            defaultProgressionPlaybookId={draftRoutine.default_progression_playbook_id ?? null}
            defaultProgressionPlaybookConfig={draftRoutine.default_progression_playbook_config ?? null}
            routineStartDate={draftRoutine.start_date}
            routineTimeZone={routineTimeZone}
            routineReferenceDate={todayRoutineSchedule?.todayDate ?? null}
            days={sortedRoutineDays.map((day, index) => {
              const dayNumber = Number.isFinite(day.day_index) ? day.day_index : index + 1;
              const canonicalDaySummary = canonicalSummaryByDayId.get(day.id);
              const recapExercises = buildRoutinePlanRecapExercises(canonicalDaySummary?.runnableExercises ?? []);

              return {
                id: day.id,
                dayIndex: dayNumber,
                name: day.name ?? null,
                occurrenceWeekday: getRoutineDayResolvedWeekdayLabel({
                  dayIndex: dayNumber,
                  startDate: draftRoutine.start_date,
                  cycleLengthDays: cycleLength,
                  scheduleMode: draftRoutine.schedule_mode,
                  profileTimeZone: routineTimeZone,
                  referenceDate: todayRoutineSchedule?.todayDate ?? null,
                  weekday: "short",
                }),
                isRest: Boolean(day.is_rest),
                splitSummary: exerciseSummaryByDayId.get(day.id),
                href: `/routines/${draftRoutine.id}/edit/day/${day.id}?returnTo=${encodeURIComponent("/routines/new")}`,
                isToday: index === todayRowIndex,
                isCompleted: completedDayIndexSet.has(dayNumber),
                isSkipped: skippedDayIndexSet.has(dayNumber),
                isInSession: inSessionDayIndex === dayNumber,
                recapExercises,
              };
            })}
            isActiveRoutine={false}
            appendRoutineDayAction={appendRoutineDayAction}
            createRoutineDayAction={createRoutineDayAction}
            deleteRoutineDayAction={deleteRoutineDayAction}
            reorderRoutineDaysAction={reorderRoutineDaysAction}
            workoutPlanSources={workoutPlanSources}
            isDraftRoutine
            initialWorkoutPlanChooserDayId={Number.isFinite(openWorkoutPlanChooserDayIndex) || Number.isFinite(pendingWorkoutPlanChooserDayIndex)
              ? (sortedRoutineDays.find((day) => day.day_index === (
                Number.isFinite(openWorkoutPlanChooserDayIndex)
                  ? openWorkoutPlanChooserDayIndex
                  : pendingWorkoutPlanChooserDayIndex
              ))?.id ?? null)
              : null}
          />
        </RoutineDetailsScreenShell>
      );
    }
  }

  return (
    <RoutineDetailsScreenShell
      backHref="/routines"
      title="New Routine"
      align="center"
    >
      <NewRoutineDraftForm
        defaults={{
          name: "",
          cycleLengthDays: 7,
          scheduleMode: "weekday_anchored",
          startDate: routineStartDateDefault,
          startWeekday: "monday",
          timezone: routineTimezoneDefault,
          weightUnit: profile.preferred_weight_unit ?? "lbs",
          distanceUnit: profile.preferred_distance_unit ?? "mi",
        }}
        existingRoutineNames={(existingRoutineRows ?? []).map((routine) => routine.name)}
        existingTemplateNames={existingTemplateNames}
      />
    </RoutineDetailsScreenShell>
  );
}
