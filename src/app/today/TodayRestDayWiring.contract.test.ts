import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(fileName: string) {
  return readFileSync(new URL(fileName, import.meta.url), "utf8");
}

test("TodayExerciseRows renders the shared RestDayCard for an empty rest day instead of a plain-text row", () => {
  const source = readSource("./TodayExerciseRows.tsx");
  assert.match(source, /import \{ RestDayCard \} from "@\/components\/day-list\/RoutineDayCardPresentation";/);
  assert.match(source, /import \{ shouldRenderTodayRestDayCard \} from "@\/app\/today\/todayRestDayCard";/);
  assert.match(source, /shouldRenderTodayRestDayCard\(\{ exerciseCount: exercises\.length, isRestDay \}\)/);
  assert.match(source, /<RestDayCard \/>/);
  // isRestDay must be a real prop, not hardcoded, so callers can opt in per state.
  assert.match(source, /isRestDay\?: boolean;/);
});

test("TodayClientShell (offline/fallback shell) tells TodayExerciseRows when the day is a rest day", () => {
  const source = readSource("./TodayClientShell.tsx");
  assert.match(source, /isRestDay=\{display\.routine\.isRest\}/);
});

test("TodayClientShell's no-routine state reuses the shared EmptyState primitive instead of a bespoke link block", () => {
  const source = readSource("./TodayClientShell.tsx");
  assert.match(source, /import \{ EmptyState \} from "@\/components\/ui\/EmptyState";/);
  assert.match(source, /<EmptyState/);
});

test("Today page's in-progress-session exercise list tells TodayExerciseRows when the day is a rest day", () => {
  const source = readSource("./page.tsx");
  assert.match(source, /isRestDay=\{todayPayload\.routine\.state === "rest"\}/);
});

test("TodayDayPicker renders a deliberate rest-day card for the closed-picker selected-rest-day case", () => {
  const source = readSource("./TodayDayPicker.tsx");
  assert.match(source, /import \{[\s\S]*?RestDayCard,[\s\S]*?\} from "@\/components\/day-list\/RoutineDayCardPresentation";/);
  assert.match(source, /const selectedDayRestCard = useMemo\(\(\) => \{/);
  assert.match(source, /if \(mode\.dayPickerOpen \|\| !mode\.restDay \|\| !selectedDay\) \{/);
  assert.match(source, /return <RestDayCard \/>;/);
  assert.match(source, /\{selectedDayRestCard \? \(/);
});

test("TodayDayPicker's rest-day card render does not also render the exercise-row list (no accidental duplicate content)", () => {
  const source = readSource("./TodayDayPicker.tsx");
  // dayRowsVisible already excludes restDay in today-page-state.ts; this just
  // pins down that the exercise-row block still gates on it here too.
  assert.match(source, /mode\.dayRowsVisible && hasSelectedDayRows/);
});
