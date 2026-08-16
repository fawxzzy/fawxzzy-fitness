import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routineEditorUrl = new URL("./RoutineEditorForm.tsx", import.meta.url);
const trainingGoalSelectorUrl = new URL("./TrainingGoalSelector.tsx", import.meta.url);
const appButtonClassesUrl = new URL("../ui/appButtonClasses.ts", import.meta.url);
const backButtonUrl = new URL("../ui/BackButton.tsx", import.meta.url);
const expandingChoiceRowUrl = new URL("../ui/ExpandingChoiceRow.tsx", import.meta.url);
const segmentedControlUrl = new URL("../ui/SegmentedControl.tsx", import.meta.url);

test("routine setup keeps compact controls inside 44px touch targets", async () => {
  const source = await readFile(routineEditorUrl, "utf8");

  assert.match(source, /RoutineEditorBinaryToggleButton[\s\S]*?min-h-11/);
  assert.match(source, /Decrease routine length[\s\S]*?className="!h-11 !w-11"/);
  assert.match(source, /Increase routine length[\s\S]*?className="!h-11 !w-11"/);
  assert.match(source, /routineEditorCycleInputClassName[\s\S]*?px-8/);
  assert.match(source, /routineEditorCycleLengthInputClassName[\s\S]*?px-12/);
  assert.match(source, /type="date"[\s\S]*?className=\{cn\(\s*routineEditorCycleInputClassName,/);
  assert.match(source, /RoutineEditorCollapsibleSection[\s\S]*?min-h-11 w-full/);
});

test("training focus controls keep the same 44px touch-target floor", async () => {
  const source = await readFile(trainingGoalSelectorUrl, "utf8");

  assert.match(source, /min-h-11 min-w-\[7\.4rem\]/);
});

test("shared compact app buttons retain the same 44px touch-target floor", async () => {
  const [appButtonSource, backButtonSource, expandingChoiceSource, segmentedControlSource] = await Promise.all([
    readFile(appButtonClassesUrl, "utf8"),
    readFile(backButtonUrl, "utf8"),
    readFile(expandingChoiceRowUrl, "utf8"),
    readFile(segmentedControlUrl, "utf8"),
  ]);

  assert.match(appButtonSource, /app-button-sm min-h-\[2\.75rem\]/);
  assert.match(backButtonSource, /!h-11 !w-11 rounded-full/);
  assert.match(expandingChoiceSource, /min-h-11 rounded-\[var\(--action-chrome-segment-radius-compact\)\]/);
  assert.match(segmentedControlSource, /min-h-11 min-w-fit/);
  assert.match(segmentedControlSource, /min-h-11 min-w-0 flex-1/);
});
