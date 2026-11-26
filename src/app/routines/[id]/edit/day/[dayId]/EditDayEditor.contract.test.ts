import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = new URL("../../../../../../", import.meta.url);
const read = (relative: string) => readFileSync(new URL(relative, SRC), "utf8");

test("edit-day goal fields wrap into rows so Max reps and the Reps toggle are never cut off (F-013)", () => {
  const list = read("app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx");
  assert.match(list, /measurementLayoutMode="horizontal-scroll"\s+\/\/[^\n]*\n\s+wrapMeasurementFields/);
  const panel = read("components/ui/measurements/MeasurementPanelV2.tsx");
  assert.match(panel, /hasWrappedRepsGroup && \(field\.id === "reps-group" \|\| field\.id === "top-field"\) \? "col-span-full"/);
});

test("the expanded exercise has no View / Delete strip: Delete is the bottom dock with a confirm (F-013)", () => {
  const list = read("app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx");
  assert.match(list, /intent="danger" onClick=\{\(\) => setDeleteConfirmOpen\(true\)\}/);
  assert.match(list, /title="Delete exercise\?"/);
  const mock = read("app/dev/mobile-regression/EditDayRegressionSurface.tsx");
  assert.doesNotMatch(mock, /AttachedCardActionStripFrame/);
});

test("progression setting tabs use plain words, not Regression / Session / Set / Example (F-013)", () => {
  const editor = read("components/routines/ProgressionPlaybookEditor.tsx");
  for (const [key, title] of [["regression", "Step back"], ["session", "Per workout"], ["set", "Per set"]] as const) {
    assert.match(editor, new RegExp(`key: "${key}",\\s+title: "${title}",`));
    assert.doesNotMatch(editor, new RegExp(`key: "${key}",\\s+title: "${key[0].toUpperCase()}${key.slice(1)}",`));
  }
  assert.doesNotMatch(editor, />Example<\/span>/);
});
