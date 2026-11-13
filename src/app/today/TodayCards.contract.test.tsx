import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup as renderMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { ToastProvider } from "../../components/ui/ToastProvider.tsx";
import { TodayDayStateCard } from "./TodayDayStateCard";
import { TodayExerciseRows, buildTodayExerciseLoggedProgress, type TodayExerciseRow } from "./TodayExerciseRows";
import { CardNotice } from "../../components/ui/card-system/index.ts";
import {
  formatExerciseProgressionLabel,
  normalizeExerciseTargetSummary,
  splitExerciseTargetValues,
} from "../../components/workout/exerciseRowCardValues.ts";
import { ExerciseRowCard } from "../../components/workout/ExerciseRowCard.tsx";

// The exercise info control mounts the info sheet (router + toast hooks), so render inside the same providers
// the app shell supplies. Static markup only: nothing here opens the sheet.
const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };

function renderToStaticMarkup(node: ReactElement) {
  return renderMarkup(
    <AppRouterContext.Provider value={router}>
      <ToastProvider>{node}</ToastProvider>
    </AppRouterContext.Provider>,
  );
}

function readSource(fileName: string) {
  return readFileSync(new URL(fileName, import.meta.url), "utf8");
}

const squat: TodayExerciseRow = {
  id: "row-1",
  exerciseId: "ex-squat",
  name: "Zed Press",
  targets: "4 sets • 5 reps • 225 lbs",
  primary_muscle: "Quads",
  movement_pattern: "Squat",
  equipment: "Barbell",
  targetSetsMin: 4,
  targetSetsMax: 4,
  progressionStateLabel: "AUTO | SESSION",
};

function rows(overrides: Partial<TodayExerciseRow>[]) {
  return renderToStaticMarkup(
    <TodayExerciseRows
      exercises={overrides.map((override, index) => ({ ...squat, id: `row-${index}`, ...override }))}
      emptyMessage="No exercises today."
    />,
  );
}

test("Today rows are a list of exercise cards: li per exercise, h2 title, static card (no header button)", () => {
  const html = rows([{}, { name: "Zed Pull", exerciseId: "ex-lunge" }]);

  assert.equal((html.match(/<li /g) ?? []).length, 2);
  assert.equal((html.match(/data-exercise-row-card="true"/g) ?? []).length, 2);
  assert.match(html, /<h2[^>]*data-card-title="true"[^>]*>Zed Press<\/h2>/);
  assert.doesNotMatch(html, /data-card-hit=/);
  assert.match(html, /Quads/);
  assert.match(html, /4 sets/);
  assert.match(html, /225 lbs/);
  assert.match(html, /AUTO · SESSION/);
});

test("Today exercise info control is a 44px card control whose name contains the exercise name", () => {
  const html = rows([{}]);
  const button = html.match(/<button[^>]*aria-label="Open exercise info for Zed Press"[^>]*>/)?.[0];

  assert.ok(button, "info button present with its accessible name");
  assert.match(button, /min-h-11/);
  assert.match(button, /min-w-11/);
  assert.match(button, /data-card-icon-button="true"/);
  assert.equal((html.match(/<button/g) ?? []).length, 1, "the info control is the only button on a static row");
  assert.doesNotMatch(html, /1\.625rem/);
});

test("Today rows show logged progress as text first and keep the bar decorative", () => {
  const html = rows([{ loggedSetCount: 2 }]);

  assert.match(html, /<p[^>]*>2 \/ 4 sets<\/p>/);
  assert.match(html, /aria-hidden="true"[^>]*><span[^>]*style="width:50%"/);
  assert.doesNotMatch(html, /role="progressbar"/);
});

test("a completed row has the success tone and a DONE chip; it is not the colour alone", () => {
  const html = rows([{ loggedSetCount: 4 }]);

  assert.match(html, /data-card-tone="completed"/);
  assert.match(html, /data-card-chip="success"[^>]*>(?:<span[^>]*>✓<\/span>)?Done</);
  assert.match(html, /4 \/ 4 sets/);
});

test("a skipped row is a compact card with a SKIPPED chip: no thumbnail, no target, no dimming", () => {
  const html = rows([{ isSkipped: true }]);

  assert.match(html, /data-card-chip="attention"[^>]*>(?:<span[^>]*>⊘<\/span>)?Skipped</);
  assert.doesNotMatch(html, /data-card-leading/);
  assert.doesNotMatch(html, /data-card-stat/);
  assert.doesNotMatch(html, /opacity-60|saturate/);
  assert.doesNotMatch(html, /0 \/ 4 sets/);
  // Something logged before the skip stays visible.
  assert.match(rows([{ isSkipped: true, loggedSetCount: 1 }]), /1 \/ 4 sets/);
});

test("showProgress=false (view-day) renders the card without progress or status", () => {
  const html = renderToStaticMarkup(
    <TodayExerciseRows exercises={[{ ...squat, loggedSetCount: 4 }]} emptyMessage="x" showProgress={false} surface="view-day" />,
  );

  assert.doesNotMatch(html, /sets<\/p>/);
  assert.doesNotMatch(html, /data-card-chip/);
  // view-day keeps the third meta fact (Barbell); Today shows two.
  assert.match(html, /Barbell/);
  assert.doesNotMatch(rows([{}]), /Barbell/);
});

test("stretch hub exercises hide the target and the progression state, as before", () => {
  const html = rows([{ name: "Hip Opener", slug: "stretch-hip-opener", kind: "stretch", type: "stretch", tags: ["stretch-hub"], categories: ["stretch-hub"] }]);

  assert.doesNotMatch(html, /225 lbs/);
  assert.doesNotMatch(html, /AUTO/);
});

test("an empty list renders a card-system empty state; an empty rest day renders the rest card as h2", () => {
  const empty = renderToStaticMarkup(<TodayExerciseRows exercises={[]} emptyMessage="No exercises today." />);
  assert.match(empty, /data-card-empty="true"/);
  assert.match(empty, /<h2[^>]*>No exercises today\.<\/h2>/);
  assert.doesNotMatch(empty, /data-rest-day-card/);

  const rest = renderToStaticMarkup(<TodayExerciseRows exercises={[]} emptyMessage="x" isRestDay />);
  assert.match(rest, /data-rest-day-card="true"/);
  assert.match(rest, /<h2[^>]*>Rest<\/h2>/);
});

test("buildTodayExerciseLoggedProgress: goal sets give a fraction and percent, no goal gives a count, skipped with nothing logged gives none", () => {
  assert.deepEqual(buildTodayExerciseLoggedProgress({ loggedSetCount: 1, goalSetTarget: 4, cardState: "default" }, false), { label: "1 / 4 sets", percent: 25, tone: "default" });
  assert.deepEqual(buildTodayExerciseLoggedProgress({ loggedSetCount: 0, goalSetTarget: 4, cardState: "default" }, false), { label: "0 / 4 sets", percent: 0, tone: "default" });
  assert.deepEqual(buildTodayExerciseLoggedProgress({ loggedSetCount: 6, goalSetTarget: 4, cardState: "completed" }, false), { label: "6 / 4 sets", percent: 100, tone: "complete" });
  assert.deepEqual(buildTodayExerciseLoggedProgress({ loggedSetCount: 3, goalSetTarget: null, cardState: "default" }, false), { label: "3 logged", percent: null, tone: "default" });
  assert.equal(buildTodayExerciseLoggedProgress({ loggedSetCount: 0, goalSetTarget: null, cardState: "default" }, false), null);
  assert.equal(buildTodayExerciseLoggedProgress({ loggedSetCount: 0, goalSetTarget: 4, cardState: "default" }, true), null);
});

test("ExerciseRowCard: chips, progress and footer render inside the one surface; the footer follows the header", () => {
  const html = renderToStaticMarkup(
    <ExerciseRowCard
      exercise={{ name: "Bench" }}
      metaItems={["Chest"]}
      targetValues={["3 sets"]}
      progress={{ label: "Progression: 3/4 sets", percent: 75 }}
      chips={<span data-test-chip="1">CHIP</span>}
      interaction={{ kind: "none" }}
      footer={<div data-test-footer="1">FOOT</div>}
    />,
  );

  assert.equal((html.match(/data-card-surface="true"/g) ?? []).length, 1);
  assert.match(html, /data-exercise-row-progress="true"/);
  assert.match(html, /data-test-chip="1"/);
  assert.ok(html.indexOf("data-test-footer") > html.indexOf("data-card-header"), "footer follows the header");
});

test("target and progression formatting is shared: Goal prefix and the missing placeholder drop out, separators normalise", () => {
  assert.equal(normalizeExerciseTargetSummary("Goal: 3 sets • 8 reps"), "3 sets • 8 reps");
  assert.equal(normalizeExerciseTargetSummary("Goal missing"), null);
  assert.equal(normalizeExerciseTargetSummary(null), null);
  assert.deepEqual(splitExerciseTargetValues("4 sets • 5 reps | 225 lbs"), ["4 sets", "5 reps", "225 lbs"]);
  assert.deepEqual(splitExerciseTargetValues(null), []);
  assert.equal(formatExerciseProgressionLabel("AUTO | SESSION"), "AUTO · SESSION");
  assert.equal(formatExerciseProgressionLabel("  "), null);
});

test("TodayDayStateCard: heading, plain body, status chip for warning and blocking, none for neutral", () => {
  const blocking = renderToStaticMarkup(<TodayDayStateCard tone="blocking" title="Edit this day first" body="This day has invalid exercises." />);
  assert.match(blocking, /<h2[^>]*>Edit this day first<\/h2>/);
  assert.match(blocking, /data-card-chip="danger"[^>]*>Can&#x27;t start</);
  assert.match(blocking, /data-card-tone="attention"/);
  assert.match(blocking, /This day has invalid exercises\./);

  const warning = renderToStaticMarkup(<TodayDayStateCard tone="warning" title="t" body="b" />);
  assert.match(warning, /data-card-chip="attention"[^>]*>Partial</);

  const neutral = renderToStaticMarkup(<TodayDayStateCard title="No scheduled workout today." body="b" />);
  assert.doesNotMatch(neutral, /data-card-chip/);
});

test("CardNotice: status role for neutral and attention, alert for danger, glyph only where colour carries meaning", () => {
  const neutral = renderToStaticMarkup(<CardNotice>Offline</CardNotice>);
  assert.match(neutral, /role="status"/);
  assert.match(neutral, /data-card-notice="neutral"/);
  assert.doesNotMatch(neutral, />!</);
  const danger = renderToStaticMarkup(<CardNotice tone="danger">Could not load Today.</CardNotice>);
  assert.match(danger, /role="alert"/);
  assert.match(danger, />!</);
  assert.match(danger, /Could not load Today\./);
});

test("Today wiring: picker rows are ExerciseRowCards with the progression action row inside the card; the picker ul>li semantics stay", () => {
  const picker = readSource("./TodayDayPicker.tsx");

  assert.match(picker, /<TodayExerciseCard/);
  assert.match(picker, /<CardActionRow/);
  assert.match(picker, /label=\{`Progression update for \$\{exercise\.name\}`\}/);
  assert.match(picker, /<RoutineOverviewDayCard[\s\S]*?asListItem/);
  assert.match(picker, /<DayList /);
  assert.match(picker, /<CardEmptyState\s+title="No exercises planned"/);
  assert.match(picker, /getRoutineDayEditHref\(progressionRoutineId, selectedDay\.id, "\/today"\)/);
  // The progression handlers are untouched: apply, revert and the confirm flow keep their names and arguments.
  assert.match(picker, /revertProgressionItemFromTodayCard\(cardAppliedPin\)/);
  assert.match(picker, /openTodayCardPromotion\(cardReadyItem\)/);
});

test("Today no longer renders the old card engine, the 26px info overlay, or hand-rolled notice surfaces", () => {
  for (const file of ["./TodayDayPicker.tsx", "./TodayExerciseRows.tsx", "./TodayExerciseCard.tsx", "./TodayClientShell.tsx"]) {
    const source = readSource(file);
    assert.doesNotMatch(source, /PlannedExerciseSummaryRow|StandardExerciseRow|(?<![A-Za-z])ExerciseCard\b|AttachedCardActionStripFrame|DayDetailStateCard|ui\/EmptyState/, file);
    assert.doesNotMatch(source, /1\.625rem|rounded-\[var\(--radius-md\)\]/, file);
  }
  assert.doesNotMatch(readSource("./page.tsx"), /rounded-\[var\(--radius-md\)\] border border-\[rgb\(var\(--danger-rgb\)/);
});

test("no behaviour code moved: TodayStartButton, the offline cache read and the live-connection notice stay in the shell", () => {
  const shell = readSource("./TodayClientShell.tsx");
  assert.match(shell, /<TodayStartButton[\s\S]*?label="Resume Workout"/);
  assert.match(shell, /readTodayCache\(userId\)/);
  assert.match(shell, /Start session requires a live connection\./);
});
