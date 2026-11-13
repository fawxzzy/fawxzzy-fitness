"use client";

import { useState, type ReactNode } from "react";
import { HistoryCalendarSurface } from "@/components/history/HistoryCalendarSurface";
import { HistoryDetailExerciseCard } from "@/components/history/HistoryDetailExerciseCard";
import { HistoryExerciseCard } from "@/components/history/HistoryExerciseCard";
import { HistoryScopeSummarySurface } from "@/components/history/HistoryScopeSummarySurface";
import { HistorySessionCard } from "@/components/history/HistorySessionCard";
import { MonthlyProgressSurface } from "@/components/history/MonthlyProgressSurface";
import { WeeklyProgressSurface } from "@/components/history/WeeklyProgressSurface";
import { WorkoutStreakSurface } from "@/components/history/WorkoutStreakSurface";
import { buildHistoryCalendarView } from "@/lib/history-calendar";
import { getHistoryPreviewExerciseRows, getHistoryPreviewSessionsPageData } from "@/lib/history-preview-fixtures";
import { buildHistoryExerciseCardViewModel } from "@/lib/workout-card-view-models";

const FIXED_NOW = "2026-04-23T12:00:00.000Z";
const data = getHistoryPreviewSessionsPageData();
const sessions = data.sessionItems;
const exerciseRows = getHistoryPreviewExerciseRows();

// The preview sessions sit in April 2026: copies in February and March give the calendar months to page through.
const calendarSessions = [
  ...sessions,
  ...["2026-03-10T12:00:00.000Z", "2026-02-12T12:00:00.000Z", "2026-02-17T12:00:00.000Z"].map((startedAt, index) => ({
    ...sessions[index % sessions.length],
    id: `gallery-calendar-${index}`,
    startedAt,
  })),
];

const monthlySummary = {
  monthKey: "2026-04",
  monthLabel: "April 2026",
  completedWorkoutCount: 3,
  activeDayCount: 3,
  setCount: 36,
  repCount: 188,
  prMomentCount: 2,
  volumeByUnit: [{ unit: "lbs", value: 12840 }, { unit: "kg", value: 3100 }],
  topExerciseName: "Back Squat",
  trend: { label: "Up", detail: "3 sessions vs 2 last month." },
} as unknown as Parameters<typeof MonthlyProgressSurface>[0]["summary"];

const streakSummary = {
  currentSessionCount: 3,
  bestSessionCount: 5,
  completedPlannedSessionCount: 3,
  trackedPlannedSessionCount: 4,
  lastCompletedDayKey: "2026-04-21",
  currentStartDayKey: "2026-04-18",
  currentEndDayKey: "2026-04-21",
} as unknown as Parameters<typeof WorkoutStreakSurface>[0]["summary"];

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="grid gap-2" aria-label={title}>
      <div className="px-1">
        <h2 className="m-0 text-lg font-semibold">{title}</h2>
        {note ? <p className="m-0 mt-0.5 text-sm text-[rgb(var(--text-secondary)/0.92)]">{note}</p> : null}
      </div>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

export function HistoryCardsGallery() {
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const calendarView = buildHistoryCalendarView({
    sessions: calendarSessions,
    timezone: "UTC",
    selectedDayKey,
    skippedDayKeys: ["2026-04-22"],
    now: FIXED_NOW,
  });

  return (
    <div className="grid gap-8" data-history-cards-gallery="true">
      <header className="px-1">
        <h1 className="m-0 text-2xl font-semibold">History cards</h1>
        <p className="m-0 mt-1 text-sm text-[rgb(var(--text-secondary)/0.92)]">Dev fixture on static data and a fixed clock ({FIXED_NOW.slice(0, 10)}).</p>
      </header>

      <Section title="Session cards (list)" note="Header is a stretched link. Signals are chips, all visible. The second card is the one the user came back from (current tone, aria-current).">
        {sessions.map((session, index) => (
          <HistorySessionCard key={session.id} session={session} previousSession={sessions[index + 1] ?? null} selected={index === 1} viewMode="compact" href={`/history/${session.id}?returnTab=sessions`} />
        ))}
      </Section>

      <Section title="Session card (detailed)" note="Stat grid and recap wrap; nothing scrolls sideways.">
        <HistorySessionCard session={sessions[0]} previousSession={sessions[1] ?? null} viewMode="detailed" href={`/history/${sessions[0].id}?returnTab=sessions`} />
      </Section>

      <Section title="Summary disclosure cards" note="Collapsed: one header, every fact on the meta line. Expanded: stat grid, recap, signals.">
        <WorkoutStreakSurface summary={streakSummary} viewMode="compact" />
        <MonthlyProgressSurface summary={monthlySummary} viewMode="compact" />
        <HistoryScopeSummarySurface summary={data.scopeSummary} viewMode="compact" titleRoutineOverride="Atlas" />
        <WeeklyProgressSurface summary={data.weeklyProgress} viewMode="compact" titleRoutineOverride="Atlas" />
      </Section>

      <Section title="Summary cards (detailed density)" note="The same cards with the panel always open.">
        <WorkoutStreakSurface summary={streakSummary} viewMode="detailed" />
        <WeeklyProgressSurface summary={data.weeklyProgress} viewMode="detailed" presentation="historical" />
      </Section>

      <Section title="Calendar" note="One month at a time, newest first. Day cells are 44px tall; days with sessions filter the list.">
        <HistoryCalendarSurface calendarView={calendarView} onSelectDayKey={setSelectedDayKey} viewMode="compact" />
      </Section>

      <Section title="Session detail exercise rows" note="Toggle row (aria-expanded), set count and timer as meta, signals as chips.">
        <HistoryDetailExerciseCard exercise={{ name: "Back Squat" }} summary="5 reps | 245 lbs" summaryLabel="Top Set" metaItems={["4/4 sets", "Timer 0:30 complete", "Typical rest 1:45"]} signalCodes={["PR", "BEST", "PROMO"]} onPress={() => {}} expanded={false} />
        <HistoryDetailExerciseCard exercise={{ name: "Walking Lunge With Dumbbells And A Deliberately Long Name" }} summary="10 reps | 40 lbs" summaryLabel="Top Set" metaItems={["3/3 sets"]} signalCodes={["PR", "WATCH"]} onPress={() => {}} expanded />
        <HistoryDetailExerciseCard exercise={{ name: "Plank" }} summary="1:00" summaryLabel="Top Set" metaItems={["3/3 sets"]} />
      </Section>

      <Section title="Exercise browser rows" note="Header opens the exercise. Compact and detailed.">
        {exerciseRows.map((row) => {
          const viewModel = buildHistoryExerciseCardViewModel(row);
          return (
            <HistoryExerciseCard
              key={row.exerciseId}
              exercise={{ name: row.name, slug: row.slug, image_path: row.image_path, image_icon_path: row.image_icon_path, image_howto_path: row.image_howto_path }}
              title={row.name}
              summaryLabel={viewModel.summaryLabel}
              summary={viewModel.summary}
              comparison={viewModel.comparison}
              metaItems={[row.primary_muscle, row.movement_pattern, row.equipment].filter((item): item is string => Boolean(item))}
              badgeItems={viewModel.badgeItems}
              density="compact"
              tone={viewModel.semanticTone}
              onPress={() => {}}
            />
          );
        })}
        {exerciseRows.slice(0, 1).map((row) => {
          const viewModel = buildHistoryExerciseCardViewModel(row);
          return (
            <HistoryExerciseCard
              key={`${row.exerciseId}-detailed`}
              exercise={{ name: row.name, slug: row.slug, image_path: row.image_path, image_icon_path: row.image_icon_path, image_howto_path: row.image_howto_path }}
              title={row.name}
              summaryLabel={viewModel.summaryLabel}
              summary={viewModel.summary}
              metaItems={[row.primary_muscle, row.movement_pattern].filter((item): item is string => Boolean(item))}
              badgeItems={viewModel.badgeItems}
              metrics={viewModel.detailedMetrics}
              trendPreview={row.trendPreview}
              detailSections={viewModel.detailedSections}
              density="detailed"
              tone={viewModel.semanticTone}
              onPress={() => {}}
            />
          );
        })}
      </Section>
    </div>
  );
}
