import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

test("the shared-day sheet names the day and offers its two choices as two footer buttons (DESIGN #5)", () => {
  const screen = read("./EditDayAddExerciseScreen.tsx");
  assert.match(screen, /\? `Save to \$\{dayName\?\.trim\(\) \|\| "this day"\}`/);
  assert.match(screen, /: `New day from \$\{dayName\?\.trim\(\) \|\| "this day"\}`/);
  assert.match(screen, /titleVariant="raw"/);
  assert.doesNotMatch(screen, /<SegmentedControl/, "no Update Day / Save New Day toggle above the buttons");
  assert.doesNotMatch(screen, /title="Day"/);
  assert.match(screen, /attachedFooter=\{/);
  assert.match(screen, /hideCancelAction/, "the sheet keeps its close button");
  assert.match(screen, /onClick=\{\(\) => submitWorkoutPlanDecision\("update_existing"\)\}[\s\S]*?Update day/);
  assert.match(screen, /data-workout-plan-decision="save-new"\s*>\s*New day\s*</, "short enough for one line at 320px");
  assert.match(screen, /onClick=\{\(\) => submitWorkoutPlanDecision\("save_new"\)\}[\s\S]*?Save new day/);
});

test("the add-exercise page passes the day name to the sheet", () => {
  assert.match(read("./add-exercise/page.tsx"), /dayName=\{dayLabel\}/);
});
