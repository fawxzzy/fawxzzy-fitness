import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("routine home keeps inline reorder handles and the add-day modal flow on the routine surface", () => {
  const source = readFileSync(new URL("./RoutineHomeClient.tsx", import.meta.url), "utf8");

  assert.match(source, /title="Drag to reorder"/);
  assert.match(source, /routineEditorHandleGlyph/);
  assert.match(source, /orderedRoutineDayIds/);
  assert.match(source, /Add Day/);
  assert.match(source, /Blank workout plan/);
  assert.match(source, /Duplicate workout plan/);
  assert.match(source, /Choose Workout Plan/);
});
