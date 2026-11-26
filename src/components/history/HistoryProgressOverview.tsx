"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { SessionSummary } from "@/app/history/session-summary";
import { ConsistencyHeatmapSurface } from "@/components/history/ConsistencyHeatmapSurface";
import { HistoryCalendarSurface } from "@/components/history/HistoryCalendarSurface";
import { HistoryScopeSummarySurface } from "@/components/history/HistoryScopeSummarySurface";
import { MonthlyProgressSurface } from "@/components/history/MonthlyProgressSurface";
import { WeeklyProgressSurface } from "@/components/history/WeeklyProgressSurface";
import { WorkoutStreakSurface } from "@/components/history/WorkoutStreakSurface";
import { AccountAchievementsSection } from "@/components/settings/AccountAchievementsSection";
import { buildHistoryAchievements } from "@/lib/history-achievements";
import { buildHistoryCalendarView } from "@/lib/history-calendar";
import { buildHistoryConsistencyHeatmap } from "@/lib/history-consistency-heatmap";
import { buildHistoryMonthlyProgress } from "@/lib/history-monthly-progress";
import type { HistoryScopeSummary } from "@/lib/history-scope-summary";
import type { WeeklyProgressSummary } from "@/lib/history-weekly-progress";
import { buildHistoryWorkoutStreak, shouldShowHistoryWorkoutStreak } from "@/lib/history-workout-streak";

/**
 * The training summary on the Progress tab (wave 2, SIMPLIFY #11, 2026-11-26).
 *
 * The six summary cards that used to sit under the Workouts list (calendar, streak, consistency, totals, this month,
 * this week) live here now, over the whole history, followed by the training milestones. Achievements are imported
 * from Settings, which keeps its own row. Picking a day on the calendar opens the Workouts list on that day.
 */
export function HistoryProgressOverview({
  sessions,
  plannedSkippedDayKeys = [],
  scopeSummary,
  weeklyProgress,
  activeRoutineTitle = null,
  calendarNow,
  workoutsHref = "/history",
}: {
  sessions: SessionSummary[];
  plannedSkippedDayKeys?: string[];
  scopeSummary: HistoryScopeSummary;
  weeklyProgress: WeeklyProgressSummary;
  activeRoutineTitle?: string | null;
  calendarNow?: string;
  /** Where a calendar day tap goes (the Workouts list, filtered to that day). */
  workoutsHref?: string;
}) {
  const router = useRouter();
  const timezone = weeklyProgress.timezone;

  const calendarView = useMemo(() => buildHistoryCalendarView({
    sessions,
    timezone,
    skippedDayKeys: plannedSkippedDayKeys,
    now: calendarNow,
  }), [calendarNow, plannedSkippedDayKeys, sessions, timezone]);
  const workoutStreak = useMemo(() => buildHistoryWorkoutStreak({
    sessions,
    timezone,
    skippedDayKeys: plannedSkippedDayKeys,
  }), [plannedSkippedDayKeys, sessions, timezone]);
  const consistencyHeatmap = useMemo(() => buildHistoryConsistencyHeatmap({
    sessions,
    timezone,
    now: calendarNow,
  }), [calendarNow, sessions, timezone]);
  const monthlyProgress = useMemo(() => buildHistoryMonthlyProgress({
    sessions,
    timezone,
    monthKey: null,
  }), [sessions, timezone]);
  const achievements = useMemo(() => buildHistoryAchievements({
    completedWorkoutCount: scopeSummary.completedWorkoutCount,
    bestSessionStreakCount: workoutStreak.bestSessionCount,
    prMomentCount: scopeSummary.prMomentCount,
  }), [scopeSummary.completedWorkoutCount, scopeSummary.prMomentCount, workoutStreak.bestSessionCount]);

  const showStreak = shouldShowHistoryWorkoutStreak({ hasSpecificTimelineFilter: false, visibleSessionCount: sessions.length });
  const openDay = (dayKey: string | null) => {
    if (dayKey) {
      router.push(`${workoutsHref}${workoutsHref.includes("?") ? "&" : "?"}day=${encodeURIComponent(dayKey)}`);
    }
  };

  return (
    <div data-history-progress-overview="true" className="grid gap-2">
      {sessions.length > 0 ? (
        <section aria-labelledby="history-progress-training-title" data-history-summaries="true" className="grid gap-2">
          <h2 id="history-progress-training-title" className="px-1.5 pt-2 text-[13px] font-semibold text-[rgb(var(--text-secondary)/0.95)]">
            Your training
          </h2>
          <div data-history-retention-surface="current-week-progression">
            <WeeklyProgressSurface summary={weeklyProgress} viewMode="compact" titleRoutineOverride={activeRoutineTitle} />
          </div>
          {showStreak ? (
            <div data-history-retention-surface="streak">
              <WorkoutStreakSurface summary={workoutStreak} viewMode="compact" />
            </div>
          ) : null}
          <div data-history-retention-surface="calendar">
            <HistoryCalendarSurface calendarView={calendarView} onSelectDayKey={openDay} viewMode="compact" />
          </div>
          <div data-history-retention-surface="heatmap">
            <ConsistencyHeatmapSurface heatmap={consistencyHeatmap} viewMode="compact" />
          </div>
          <div data-history-retention-surface="monthly">
            <MonthlyProgressSurface summary={monthlyProgress} viewMode="compact" />
          </div>
          <HistoryScopeSummarySurface summary={scopeSummary} viewMode="compact" titleRoutineOverride={activeRoutineTitle} />
        </section>
      ) : null}
      <div className="pt-2" data-history-progress-achievements="true">
        <AccountAchievementsSection achievements={achievements} />
      </div>
    </div>
  );
}
