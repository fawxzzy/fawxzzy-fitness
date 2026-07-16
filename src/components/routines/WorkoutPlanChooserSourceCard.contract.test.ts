import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./WorkoutPlanChooserSourceCard.tsx", import.meta.url), "utf8");

test("workout-plan chooser recap cards use bounded content sizing", () => {
  assert.match(
    source,
    /WORKOUT_PLAN_CHOOSER_RECAP_ITEM_CLASS_NAME = "!w-max !min-w-\[9\.75rem\] !max-w-\[13\.7rem\]"/,
  );
  assert.doesNotMatch(source, /WORKOUT_PLAN_CHOOSER_RECAP_ITEM_CLASS_NAME[^\n]*100vw/);
});

test("workout-plan chooser keeps the shared horizontal exercise rail", () => {
  assert.match(source, /RoutineDayCardRecapPreview\(source, \{/);
  assert.match(source, /scrollClassName: WORKOUT_PLAN_CHOOSER_RECAP_SCROLL_CLASS_NAME/);
  assert.match(source, /contentClassName: WORKOUT_PLAN_CHOOSER_RECAP_CONTENT_CLASS_NAME/);
  assert.match(source, /itemClassName: WORKOUT_PLAN_CHOOSER_RECAP_ITEM_CLASS_NAME/);
});

test("workout-plan chooser title follows the top-left routine-card pattern", () => {
  assert.match(source, /className="flex w-full justify-start text-left"/);
  assert.match(source, /flex-col items-start gap-1 text-left/);
  assert.match(source, /break-words text-left leading-\[1\.1\]/);
  assert.match(source, /<MetricAccentBar variant="thin" className="w-full max-w-full" \/>/);
  assert.doesNotMatch(source, /title=\{\([\s\S]*?justify-center text-center[\s\S]*?\)\}/);
});
