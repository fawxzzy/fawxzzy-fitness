import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const filterToggleUrl = new URL("./FilterToggleButton.tsx", import.meta.url);
const exerciseInfoSheetUrl = new URL("../ExerciseInfoSheet.tsx", import.meta.url);
const exerciseTagFilterControlUrl = new URL("../ExerciseTagFilterControl.tsx", import.meta.url);

test("exercise-info filter controls keep a 44px touch-target floor", async () => {
  const [filterToggleSource, exerciseInfoSheetSource, exerciseTagFilterControlSource] = await Promise.all([
    readFile(filterToggleUrl, "utf8"),
    readFile(exerciseInfoSheetUrl, "utf8"),
    readFile(exerciseTagFilterControlUrl, "utf8"),
  ]);

  assert.match(filterToggleSource, /min-h-11 min-w-\[3\.45rem\]/);
  assert.match(exerciseInfoSheetSource, /Re-sync exercise info filters[\s\S]*?min-h-11 min-w-\[3\.55rem\]/);
  assert.match(exerciseInfoSheetSource, /!min-h-\[44px\] !w-auto !min-w-\[3\.45rem\]/);
  assert.match(exerciseTagFilterControlSource, /!min-h-\[44px\] !w-auto !min-w-\[3\.45rem\]/);
});
