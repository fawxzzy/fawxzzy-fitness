import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

test("Add exercise starts with nothing selected and never pins the selection into search results (F-003)", () => {
  const picker = read("../ExercisePicker.tsx");
  const flow = read("../exercises/ExerciseChooserAddFlowForm.tsx");
  assert.doesNotMatch(picker, /uniqueExercises\[0\]\?\.id/, "no fallback to the first library exercise");
  assert.doesNotMatch(picker, /return \[selectedExercise, \.\.\.matches\]/, "a search shows only what matches");
  assert.doesNotMatch(flow, /exercises\[0\]/, "the add flow does not pre-select the first exercise either");
});

test("the goal sheet names the selected exercise and folds to one row without dropping its inputs", () => {
  const picker = read("../ExercisePicker.tsx");
  assert.match(picker, /data-exercise-picker-goal-header=""/);
  assert.match(picker, /Goal for/);
  assert.match(picker, /\{goalDockExerciseName\}/);
  assert.match(picker, /aria-expanded=\{!isGoalDockCollapsed\}/);
  // Folded with `hidden`, not unmounted, so targetSets/targetReps... still submit with the form.
  assert.match(picker, /hidden=\{isGoalDockCollapsed\}/);
  assert.match(picker, /className="inline-flex min-h-11 shrink-0/, "the fold toggle is a 44px target");
});

test("add exercise has one explainer: the guide row, not the fixed INFO dock that covered the goal sheet", () => {
  const flow = read("../exercises/ExerciseChooserAddFlowForm.tsx");
  assert.match(flow, /<AddExerciseGuide /);
  assert.match(flow, /showProgressionInfo=\{false\}/);
  assert.doesNotMatch(flow, /infoDockPlacement="above-bottom-actions"/);
  assert.match(read("../routines/ProgressionPlaybookEditor.tsx"), /const shouldRenderProgressionInfo = showProgressionInfo;/);
});

test("picker info button, search clear and info-sheet chart points are real 44px targets (F-010)", () => {
  const list = read("./list.tsx");
  const filters = read("../exercises/ExerciseSearchFilters.tsx");
  const sheet = read("../ExerciseInfoSheet.tsx");
  assert.match(list, /data-exercise-picker-info-button=""\s+className="[^"]*\bh-11 w-11\b/);
  assert.match(filters, /"inline-flex h-11 w-11 items-center justify-center rounded-full/);
  assert.doesNotMatch(filters, /"inline-flex h-7 w-7/);
  assert.match(sheet, /className="absolute h-11 w-11 -translate-x-1\/2 -translate-y-1\/2/);
});

test("the edit-day type is a plain Rest day switch with Bonus day under More options (F-009, SIMPLIFY #9)", () => {
  const form = read("../../app/routines/[id]/edit/day/[dayId]/EditDaySettingsAutosaveForm.tsx");
  assert.doesNotMatch(form, /<RoutineDayKindSelector/);
  assert.doesNotMatch(form, /label: "Required"/, "no Required / Optional / Rest jargon on top of every day");
  assert.match(form, /<OptionSwitchRow\s+label="Rest day"/);
  assert.match(form, /<MoreOptionsDisclosure[^>]*>\s+<OptionSwitchRow\s+label="Bonus day"\s+hint="Not counted if skipped\."/);
});
