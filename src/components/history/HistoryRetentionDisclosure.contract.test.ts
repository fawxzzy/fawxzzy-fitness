import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const disclosureSource = readFileSync(new URL("./HistoryMetricsDisclosure.tsx", import.meta.url), "utf8");
const monthlySource = readFileSync(new URL("./MonthlyProgressSurface.tsx", import.meta.url), "utf8");
const streakSource = readFileSync(new URL("./WorkoutStreakSurface.tsx", import.meta.url), "utf8");
const calendarSource = readFileSync(new URL("./HistoryCalendarSurface.tsx", import.meta.url), "utf8");
const historyClientSource = readFileSync(new URL("../../app/history/HistorySessionsClient.tsx", import.meta.url), "utf8");

test("compact History disclosures rotate green metadata beside the chevron", () => {
  assert.match(disclosureSource, /window\.setInterval\(\(\) => \{/);
  assert.match(disclosureSource, /\}, 3200\)/);
  assert.match(disclosureSource, /text-\[rgb\(var\(--success-rgb\)\/0\.94\)\]/);
  assert.match(disclosureSource, /\{summary\}[\s\S]*ChevronDownIcon/);
});

test("monthly and session streak headers use canonical title metadata and rotating summaries", () => {
  assert.match(monthlySource, /HistoryDisclosureTitle label="Monthly" meta=\{summary\.monthLabel\} metaTone="yellow"/);
  assert.match(monthlySource, /compactSummaryItems=\{compactSummaryItems\}/);
  assert.match(monthlySource, /summary\.completedWorkoutCount > 0/);

  assert.match(streakSource, /HistoryDisclosureTitle label="Session Streak" meta=\{formatStreakRange\(summary\)\}/);
  assert.match(streakSource, /compactSummaryItems=/);
  assert.doesNotMatch(streakSource, /Weekly Streak/);
});

test("compact Calendar is collapsible with green disclosure accents and Session Streak follows it", () => {
  assert.match(calendarSource, /viewMode: "compact" \| "detailed"/);
  assert.match(calendarSource, /<HistoryCompactDisclosure title="Calendar" accentTone="green">/);
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

test("History timeline filters expose one clear-all control and hide unrelated summaries", () => {
  assert.match(historyClientSource, /aria-label="Clear all History filters"/);
  assert.match(historyClientSource, /<FilterSection title="Session Date"/);
  assert.match(historyClientSource, /<FilterSection title="Month"/);
  assert.match(historyClientSource, /hasSpecificTimelineFilter/);
  assert.match(historyClientSource, /!hasSpecificTimelineFilter \? \(/);
  assert.match(historyClientSource, /!effectiveSelectedDayKey && !hasCycleTimelineFilter \? \(/);
});
