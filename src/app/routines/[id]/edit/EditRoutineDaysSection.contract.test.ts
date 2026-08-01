import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./EditRoutineDaysSection.tsx", import.meta.url), "utf8");

test("EditRoutineDaysSection derives each row's presentation through the shared, tested resolver", () => {
  assert.match(
    source,
    /import \{ resolveEditRoutineDayRowPresentation \} from "@\/app\/routines\/\[id\]\/edit\/editRoutineDayRowPresentation";/,
  );
  assert.match(source, /const presentation = resolveEditRoutineDayRowPresentation\(day\);/);
  assert.match(source, /subtitle=\{presentation\.subtitle\}/);
  assert.match(source, /badgeText=\{presentation\.badgeText\}/);
  assert.match(source, /state=\{presentation\.state\}/);
});

test("EditRoutineDaysSection no longer conflates rest days with not-configured-yet days inline", () => {
  // The old bug: `state={day.isRest || day.needsSetup ? "empty" : "default"}`
  // with no differentiating copy/badge for the rest case. Presentation is now
  // fully owned by resolveEditRoutineDayRowPresentation instead.
  assert.doesNotMatch(source, /day\.isRest \|\| day\.needsSetup/);
  assert.doesNotMatch(source, /badgeText=\{day\.needsSetup \? "Needs Setup" : undefined\}/);
});

test("EditRoutineDaysSection does not expose exercise-editing controls inline on a day row (row is a plain navigation link)", () => {
  assert.doesNotMatch(source, /onAddExercise|onEditExercise|ExercisePicker/);
});
