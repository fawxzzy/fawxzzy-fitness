import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const disclosureSource = readFileSync(new URL("./HistoryMetricsDisclosure.tsx", import.meta.url), "utf8");
const monthlySource = readFileSync(new URL("./MonthlyProgressSurface.tsx", import.meta.url), "utf8");
const streakSource = readFileSync(new URL("./WorkoutStreakSurface.tsx", import.meta.url), "utf8");
const calendarSource = readFileSync(new URL("./HistoryCalendarSurface.tsx", import.meta.url), "utf8");
const historyClientSource = readFileSync(new URL("../../app/history/HistorySessionsClient.tsx", import.meta.url), "utf8");

test("compact History disclosures are one card: a toggle header, every summary fact visible, no timers", () => {
  assert.match(disclosureSource, /<CardHeader/);
  assert.match(disclosureSource, /kind: "toggle"/);
  assert.match(disclosureSource, /controlsId: panelId/);
  assert.match(disclosureSource, /hidden=\{!open\}/);
  assert.match(disclosureSource, /<CardMeta items=\{normalizedSummaryItems\}/);
  assert.doesNotMatch(disclosureSource, /setInterval|useEffect/);
});

test("monthly and session streak headers use title + qualifier and list every summary fact", () => {
  assert.match(monthlySource, /title="Monthly"/);
  assert.match(monthlySource, /titleMeta=\{summary\.monthLabel\}/);
  assert.match(monthlySource, /compactSummaryItems=\{compactSummaryItems\}/);
  assert.match(monthlySource, /summary\.completedWorkoutCount > 0/);

  assert.match(streakSource, /title="Session Streak"/);
  assert.match(streakSource, /titleMeta=\{formatStreakRange\(summary\)\}/);
  assert.match(streakSource, /compactSummaryItems=/);
  assert.doesNotMatch(streakSource, /Weekly Streak/);
});

test("compact Calendar is a collapsible History disclosure card and Session Streak follows it", () => {
  assert.match(calendarSource, /viewMode: "compact" \| "detailed"/);
  assert.match(calendarSource, /<HistoryDisclosureCard title="Calendar" tone="logged"/);
  assert.doesNotMatch(calendarSource, /Tap a day to filter the session list/);
  assert.match(historyClientSource, /onSelectDayKey=\{handleCalendarDayChange\}[\s\S]*viewMode=\{viewMode\}/);

  const calendarIndex = historyClientSource.indexOf('data-history-retention-surface="calendar"');
  const streakIndex = historyClientSource.indexOf('data-history-retention-surface="streak"');
  const summaryIndex = historyClientSource.indexOf("<HistoryScopeSummarySurface");
  const monthlyIndex = historyClientSource.indexOf('data-history-retention-surface="monthly"');

  assert.ok(calendarIndex >= 0);
  assert.ok(calendarIndex < streakIndex);
  assert.ok(streakIndex < summaryIndex);
  assert.ok(summaryIndex < monthlyIndex);
});

test("Calendar month grids replace neighboring-month dates with blank fillers", () => {
  assert.match(calendarSource, /if \(!day\.inMonth\)/);
  assert.match(calendarSource, /data-calendar-day-filler="true"/);
  assert.match(calendarSource, /aria-hidden="true"/);
  assert.doesNotMatch(calendarSource, /disabled=\{!day\.inMonth/);
});

test("History no longer owns Achievements presentation", () => {
  assert.doesNotMatch(historyClientSource, /HistoryAchievementsSurface/);
  assert.doesNotMatch(historyClientSource, /buildHistoryAchievements/);
});

test("History timeline filters expose one clear-all control and hide unrelated summaries", () => {
  // History redesign 2026-11-23: filters moved into the shared Filters sheet; its footer and the chip row own Clear all.
  assert.match(historyClientSource, /<HistoryFilterBar/);
  assert.match(historyClientSource, /onClearAll=\{clearAllFilters\}/);
  assert.match(historyClientSource, /title: "Session date"/);
  assert.match(historyClientSource, /title: "Month"/);
  assert.match(historyClientSource, /hasSpecificTimelineFilter/);
  assert.match(historyClientSource, /showWorkoutStreak = shouldShowHistoryWorkoutStreak\(\{/);
  assert.match(historyClientSource, /sessions: filteredSessions/);
  assert.match(historyClientSource, /summary=\{displayedWorkoutStreak\}/);
  assert.match(historyClientSource, /!effectiveSelectedDayKey && !hasCycleTimelineFilter \? \(/);
});

test("History screens carry no mis-encoded separators (a UTF-8 middle dot read as Latin-1 shows as \"Â·\")", () => {
  const files = [
    "../../app/history/HistorySessionsClient.tsx",
    "../../app/history/[sessionId]/LogAuditClient.tsx",
    "../../app/history/exercises/ExerciseBrowserClient.tsx",
    "./HistoryFilterBar.tsx",
    "./ProgressionHistorySurface.tsx",
    "./ProgressionHistoryFilters.tsx",
    "./HistoryLoadErrorState.tsx",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.equal(/\u00c2[\u00a0-\u00bf]|\u00e2\u20ac/.test(source), false, `${file} has mojibake`);
  }
});

test("a deleted session behind a Progression 'Open session' link lands on the History not-found card", () => {
  const detailPage = readFileSync(new URL("../../app/history/[sessionId]/page.tsx", import.meta.url), "utf8");
  const notFoundPage = readFileSync(new URL("../../app/history/[sessionId]/not-found.tsx", import.meta.url), "utf8");
  const progression = readFileSync(new URL("./ProgressionHistorySurface.tsx", import.meta.url), "utf8");
  assert.match(progression, /href=\{`\/history\/\$\{row\.sourceSessionId\}`\}/);
  assert.match(detailPage, /if \(!session\) \{\s*notFound\(\);/);
  assert.match(detailPage, /isNotFoundError\(error\)\) \{\s*throw error;/, "notFound() is not swallowed by the load-error catch");
  assert.match(notFoundPage, /<HistorySessionMissingState \/>/);
});
