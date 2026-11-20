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
const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "test" };

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
  // One goal line from the shared formatter; the spoken form spells it out for screen readers.
  assert.match(html, /data-exercise-goal="true"[^>]*><span aria-hidden="true">4 × 5 @ 225 lbs<\/span><span class="sr-only">Goal: 4 sets of 5 reps at 225 lbs<\/span>/);
  // No progression-mode bubbles, no "Target" label block.
  assert.doesNotMatch(html, /AUTO|SESSION|MANUAL|data-exercise-progression-label/);
  assert.doesNotMatch(html, />Target<|data-card-stat/);
});

test("exercise card layout: thumbnail top-right and info bottom-right in one side column; text starts at the left edge", () => {
  const html = rows([{}]);
  const side = html.match(/<div data-card-trailing="true"[^>]*>[\s\S]*<\/div>/)?.[0] ?? "";

  assert.doesNotMatch(html, /data-card-leading/, "no leading media: text starts at the left edge");
  assert.match(side, /class="[^"]*pointer-events-none[^"]*flex-col[^"]*self-stretch[^"]*!items-end[^"]*justify-between/);
  assert.ok(side.indexOf("data-exercise-thumb-slot") >= 0, "thumbnail lives in the side column");
  assert.ok(side.indexOf("data-exercise-thumb-slot") < side.indexOf("data-exercise-controls"), "thumbnail above the controls");
  assert.match(side, /data-exercise-controls="true" class="pointer-events-auto[^"]*"[^>]*>[\s\S]*aria-label="Open exercise info for Zed Press"/);
  // No image: the controls still sit at the bottom (a spacer keeps the column split).
  const noImage = renderToStaticMarkup(
    <ExerciseRowCard exercise={{ name: "Bench" }} metaItems={[]} targetValues={["3 sets"]} showMedia={false} interaction={{ kind: "none" }} trailing={<button type="button">i</button>} />,
  );
  assert.doesNotMatch(noImage, /data-exercise-thumb-slot/);
  assert.match(noImage, /data-card-trailing="true"[^>]*><span aria-hidden="true"><\/span><span data-exercise-controls="true"/);
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

  assert.match(html, /<p[^>]*><span[^>]*>2 \/ 4 sets<\/span><\/p>/);
  assert.match(html, /aria-hidden="true"[^>]*><span[^>]*style="width:50%"/);
  assert.doesNotMatch(html, /role="progressbar"/);
  assert.doesNotMatch(html, /data-exercise-promote/, "logged sets never offer Promote");
});

test("progress label: 'Kicker: value' splits into a quiet kicker and the value; the bar is the same 6px bar on every card", () => {
  const html = renderToStaticMarkup(
    <ExerciseRowCard exercise={{ name: "Bench" }} metaItems={[]} targetValues={[]} progress={{ label: "Progression: 3/4 sets", percent: 75 }} interaction={{ kind: "none" }} />,
  );
  assert.match(html, /<span class="text-\[rgb\(var\(--text-muted\)\/0\.98\)\]">Progression<span class="sr-only">:<\/span><\/span><span[^>]*>3\/4 sets<\/span>/);
  assert.match(html, /aria-hidden="true" class="relative block h-1\.5 [^"]*flex-1/);
  assert.match(rows([{ loggedSetCount: 2 }]), /aria-hidden="true" class="relative block h-1\.5 [^"]*flex-1/);
});

test("a completed row has the success tone and a check mark beside the name (with a spoken 'done'); no DONE chip", () => {
  const html = rows([{ loggedSetCount: 4 }]);

  assert.match(html, /data-card-tone="completed"/);
  assert.match(html, /<h2[^>]*data-card-title="true"[^>]*>Zed Press<span data-exercise-done-check="true"[^>]*>[\s\S]*?<span class="sr-only">, done<\/span><\/span><\/h2>/);
  assert.match(html, /data-exercise-done-check="true" class="[^"]*animate-exercise-done[^"]*motion-reduce:animate-none/);
  assert.doesNotMatch(html, /data-card-chip=/);
  assert.match(html, /4 \/ 4 sets/);
  assert.doesNotMatch(rows([{ loggedSetCount: 3 }]), /data-exercise-done-check/);
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
  assert.deepEqual(buildTodayExerciseLoggedProgress({ loggedSetCount: 0, goalSetTarget: 1, cardState: "default" }, false), { label: "0 / 1 set", percent: 0, tone: "default" });
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
  // Switch Day is the shared TodaySwitchDayList (ul>li semantics pinned in TodaySwitchDayCard.contract.test.tsx).
  assert.match(picker, /<TodaySwitchDayList\b/);
  // The empty training day is the shared empty-day card; its one action opens the Edit Day editor and returns here.
  assert.match(picker, /<TodayEmptyDayCard\s+kind="empty"/);
  assert.match(picker, /getRoutineDayEditHref\(progressionRoutineId, selectedDay\.id, "\/today"\)/);
  // The progression handlers are untouched: apply, revert and the confirm flow keep their names and arguments.
  assert.match(picker, /revertProgressionItemFromTodayCard\(cardAppliedPin\)/);
  assert.match(picker, /openTodayCardPromotion\(cardReadyItem\)/);
  // Promote on the bar: only a full (100%) promote card with no pending Revert, and only when the action is wired.
  assert.match(picker, /cardReadyItem\?\.type === "promote"\s*&& canShowCardAction\s*&& cardProgressFill\.state === "ready"/);
  assert.match(picker, /promote: cardBarPromote && cardReadyItem \? \{\s*onPromote: \(\) => openTodayPromoteFlow\(cardReadyItem\)/);
  assert.doesNotMatch(picker, /onPromoteExercise|SERVER-ACTION SEAM/, "the old unwired seam is gone");
});

test("Promote wiring: the real Today page passes the server action; the dev route passes only a local stub", () => {
  const page = readSource("./page.tsx");
  // The live caller: the manual-promote server action, imported from the progression-review actions.
  assert.match(page, /import \{[^}]*\bpromoteExerciseAction\b[^}]*\} from "@\/app\/progression-review\/actions"/);
  assert.match(page, /<TodayDayPicker[\s\S]*?promoteExerciseAction=\{promoteExerciseAction\}[\s\S]*?\/>/);

  // The dev caller: DevMobileRegressionRoute renders the picker through a client wrapper with local stubs only.
  const devRoute = readSource("../dev/mobile-regression/DevMobileRegressionRoute.tsx");
  const devWrapper = readSource("../dev/mobile-regression/DevTodayPickerWithPromote.tsx");
  assert.match(devRoute, /<DevTodayPickerWithPromote\b/);
  assert.doesNotMatch(devRoute, /<TodayDayPicker\b/, "the dev Today scenarios use the stub wrapper");
  assert.match(devWrapper, /^"use client";/);
  assert.match(devWrapper, /<TodayDayPicker[\s\S]*?promoteExerciseAction=\{promoteExerciseAction\}/);
  for (const source of [devRoute, devWrapper]) {
    assert.doesNotMatch(source, /from "@\/app\/progression-review\/actions"/, "dev fixtures never import the server actions");
  }

  // The Promote box: confirm first, the action runs once from Promote, the pin keeps Revert working, Today refreshes.
  const picker = readSource("./TodayDayPicker.tsx");
  assert.match(picker, /<PromoteCelebration[\s\S]*?onConfirm=\{confirmTodayPromote\}/);
  assert.match(picker, /await promoteExerciseAction\(\{/);
  assert.match(picker, /upsertProgressionAppliedPin\(readAllProgressionAppliedPins\(\), pin\)[\s\S]*?phase: "done"/);
  assert.match(picker, /toast\.error\(result\.ok \? PROGRESSION_PROMOTE_MESSAGES\.unverified : result\.error\)/);
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
  assert.match(shell, /<TodayStartButton[\s\S]*?label="Resume"/);
  assert.match(shell, /readTodayCache\(userId\)/);
  assert.match(shell, /Start session requires a live connection\./);
});

test("FF-TODAY-004: an exercise without a goal shows a quiet 'No goal set' cue (the card never says 'Target'), never 'Goal missing'; goals and stretch hub stay clean", () => {
  const none = rows([{ targets: null }]);
  assert.match(none, /data-exercise-no-target="true"[^>]*>No goal set</);
  assert.doesNotMatch(none, /Goal missing/);
  const cardWords = `${none.replace(/<[^>]*>/g, " ")} ${[...none.matchAll(/aria-label="([^"]*)"/g)].map((match) => match[1]).join(" ")}`;
  assert.doesNotMatch(cardWords, /\btarget\b/i, "no 'target' in visible text or aria labels");
  assert.doesNotMatch(rows([{}]), /No goal set/);
  assert.doesNotMatch(rows([{ targets: null, name: "Hip Opener", slug: "stretch-hip-opener", kind: "stretch", type: "stretch", tags: ["stretch-hub"], categories: ["stretch-hub"] }]), /No goal set/);
});

test("FF-DESIGN-004: the Today info control uses the real exercise id, never the row id", () => {
  const source = readFileSync(new URL("./TodayClientShell.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /exerciseId:\s*exercise\.exerciseId \?\? exercise\.id/);
});
