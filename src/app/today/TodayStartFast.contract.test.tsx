import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup as renderMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { ToastProvider } from "../../components/ui/ToastProvider.tsx";
import { TodayExerciseRows, type TodayExerciseRow } from "./TodayExerciseRows";
import { TodayInSessionCard, formatTodayInSessionMeta } from "./TodayInSessionCard";

// Wave 2 L-C "Start fast": Today is one calm screen. Compact rows (name, goal, "Last: ..."), ONE primary in the dock,
// "Not today? Switch day" as a text link, Discard in the in-session card's menu, and "Done today" after Finish.

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "test" };

function render(node: ReactElement) {
  return renderMarkup(
    <AppRouterContext.Provider value={router}>
      <ToastProvider>{node}</ToastProvider>
    </AppRouterContext.Provider>,
  );
}

const readSource = (fileName: string) => readFileSync(new URL(fileName, import.meta.url), "utf8");

const bench: TodayExerciseRow = {
  id: "row-1",
  exerciseId: "ex-bench",
  name: "Bench Press",
  targets: "3 sets • 8-12 reps",
  primary_muscle: "Chest",
  equipment: "Barbell",
  movement_pattern: "Push",
  image_icon_path: "/exercises/icons/bench.png",
  lastLine: "Last: 5 × 225 lb",
};

test("compact rows show name, goal and the Last line only: no muscle/equipment meta and no thumbnail", () => {
  const compact = render(<TodayExerciseRows exercises={[bench]} emptyMessage="x" compact />);
  assert.match(compact, />Bench Press</);
  assert.match(compact, /Last: 5 × 225 lb/);
  assert.doesNotMatch(compact, /Chest|Barbell/);
  assert.doesNotMatch(compact, /<img /);

  // (The full card's thumbnail needs next/image, which static markup in node cannot render, so drop the icon here.)
  const full = render(<TodayExerciseRows exercises={[{ ...bench, image_icon_path: null }]} emptyMessage="x" />);
  assert.doesNotMatch(full, /Last: 5 × 225 lb/, "the Last line is a compact-only addition; other surfaces are unchanged");

  const firstTime = render(<TodayExerciseRows exercises={[{ ...bench, lastLine: null }]} emptyMessage="x" compact />);
  assert.doesNotMatch(firstTime, /Last:/, "never done before: no Last line, no placeholder");
});

test("the in-session card says a workout is open, counts logged sets, and keeps Discard behind its menu", () => {
  assert.equal(formatTodayInSessionMeta(0), "No sets logged yet");
  assert.equal(formatTodayInSessionMeta(1), "1 set logged");
  assert.equal(formatTodayInSessionMeta(7), "7 sets logged");
  assert.equal(formatTodayInSessionMeta(Number.NaN), "No sets logged yet");

  const html = render(
    <TodayInSessionCard sessionId="s-1" dayName="Push A" loggedSetCount={3} action={async () => ({ ok: true })} failureMessage="Could not discard." />,
  );
  assert.match(html, /data-today-in-session-card="true"/);
  assert.match(html, /<h2[^>]*>Workout in progress<\/h2>/);
  assert.match(html, /Push A/);
  assert.match(html, /3 sets logged/);
  assert.match(html, /aria-label="Workout actions"/);
  assert.match(html, /<input type="hidden" name="sessionId" value="s-1"\/>/);
  assert.doesNotMatch(html, />Discard</, "Discard is not on screen until the menu opens");

  const card = readSource("./TodayInSessionCard.tsx");
  assert.match(card, /label: "Discard workout",\s+tone: "danger"/);
  assert.match(card, /<ConfirmDestructiveModal/);
  assert.match(card, /if \(submittingRef\.current \|\| !formRef\.current\) return;/, "a double tap on the confirm submits once");
  assert.match(card, /if \(isRedirectError\(error\)\) throw error;/);
  assert.match(card, /toast\.error\(message\);\s+router\.refresh\(\);/, "failures use the in-flow notice and refresh");
});

test("Today's dock has ONE primary; Switch day is a text link that never shares the dock with Start", () => {
  const picker = readSource("./TodayDayPicker.tsx");
  assert.doesNotMatch(picker, /BottomActionSplit/);
  assert.match(picker, /if \(mode\.dayPickerOpen \|\| !showPrimaryAction\) \{/);
  assert.match(picker, /\{mode\.dayPickerOpen \? "Hide" : "Switch day"\}/);
  assert.match(picker, /const switchDayLink = !mode\.dayPickerOpen && showPrimaryAction \?/, "the link and the dock toggle are mutually exclusive, so the id stays unique");
  assert.match(picker, /Not today\?\{" "\}/);
  assert.match(picker, /data-today-switch-day-link="true"/);
  assert.match(picker, /min-h-11/, "the link is a 44px target");
  assert.equal((picker.match(/id="today-day-picker"/g) ?? []).length, 2);
  assert.match(picker, /<TodayExerciseCard\s+exercise=\{exercise\}\s+surface="today"\s+compact/);

  const page = readSource("./page.tsx");
  assert.doesNotMatch(page, /BottomActionSplit|ConfirmedServerFormButton/);
  assert.match(page, /<BottomActionSingle>\s+<TodayStartButton\s+sessionId=\{todayPayload\.inProgressSessionId\}[\s\S]*?label="Resume workout"/);
  assert.match(page, /<TodayInSessionCard[\s\S]*?action=\{discardInProgressSessionAction\}/);
  assert.match(page, /isRestDay=\{todayPayload\.routine\.state === "rest"\}\s+compact/);
});

test("after Finish, today's own day shows Done today with the next day and no Start", () => {
  const picker = readSource("./TodayDayPicker.tsx");
  assert.match(picker, /const doneTodayCard = showDoneToday \? <TodayEmptyDayCard kind="done" nextUp=\{selectedDayNextUp\} \/> : null;/);
  assert.match(picker, /const showPrimaryAction = mode\.cta\.showPrimary && !showDoneToday;/);
  assert.match(picker, /mode\.dayRowsVisible && hasSelectedDayRows && !showDoneToday/);
  assert.match(picker, /selectedDay\.dayIndex === currentDayIndex,/, "only today's own day; another picked day still starts");
  assert.match(picker, /\{ todayDate: selectedDay\.dayIndex === currentDayIndex \? todayDate : null \}/, "dates only from today's own day");

  const page = readSource("./page.tsx");
  assert.match(page, /todayDate=\{todayReferenceDate\}/);
  assert.match(page, /doneToday=\{completedTodayCount > 0 && !todayPayload\.inProgressSessionId\}/);
  assert.match(page, /loadTodayLastPerformanceLines\(\{/);
});
