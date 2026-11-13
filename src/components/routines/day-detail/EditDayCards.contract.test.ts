import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const here = (name: string) => new URL(name, import.meta.url);

test("edit-day exercise list renders ExerciseRowCard with a 44px DragHandle (pointer drag plus ArrowUp/ArrowDown)", () => {
  const editable = readFileSync(here("../../../app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx"), "utf8");
  const list = readFileSync(here("./DayDetailExerciseList.tsx"), "utf8");

  assert.match(editable, /<DragHandle/);
  assert.match(editable, /onMove=\{\(direction\) => moveItemByStep\(exerciseId, direction\)\}/);
  assert.match(editable, /onPointerDown=\{\(event\) => handleHandlePointerDown\(exerciseId, event\)\}/);
  assert.match(editable, /persistOrder\(nextItems, exerciseId\)/);
  assert.doesNotMatch(editable, /ReorderHandleGlyph|CARD_REORDER_HANDLE_CLASS_NAME/);

  assert.match(list, /<ExerciseRowCard/);
  assert.match(list, /data-exercise-row-id=\{item\.id\}/, "pointer drag finds its drop row through this attribute");
  assert.match(list, /buttonProps: \{ "data-testid": contract\.buttonTestId \}/);
  assert.match(list, /panelProps=\{\{ id: contract\.panelId, "data-testid": contract\.panelTestId \}\}/);
  assert.match(list, /<CardInfoButton/);
  // The order cue ("Order 2") is the first meta fact in the editor, text rather than colour.
  assert.match(list, /showOrderBadges = mode === "editable"/);
  assert.match(list, /`Order \$\{item\.orderNumber\}`/);
  // aria-controls only points at a panel that is rendered (expanded).
  assert.match(list, /controlsId: isActive \? contract\.panelId : undefined/);
  assert.doesNotMatch(list, /ExerciseDisclosureCard|StandardExerciseRow|SHARED_PLANNED_CARD|MetricAccentBar/);
});

test("day settings autosave submits the stored day name unless the name field was edited (a toggle must not persist the position number)", () => {
  const form = readFileSync(here("../../../app/routines/[id]/edit/day/[dayId]/EditDaySettingsAutosaveForm.tsx"), "utf8");

  assert.match(form, /formData\.set\("name", resolveRoutineDaySettingsSubmitName\(\{\s*storedName: name,\s*displayName: initialEditableName,\s*draftName: nextSnapshot\.name,\s*\}\)\)/);
  assert.doesNotMatch(form, /formData\.set\("name", nextSnapshot\.name\)/);
});

test("exercise card trailing controls are stacked 44px targets and the sticky header keeps working when expanded", () => {
  const card = readFileSync(here("../../workout/ExerciseRowCard.tsx"), "utf8");

  assert.match(card, /trailingClassName="flex-col"/);
  assert.match(card, /stickyHeader && interaction\.kind === "toggle" && interaction\.expanded/);
  assert.match(card, /allowOverflow=/);
  assert.match(card, /size=\{EXERCISE_ROW_THUMB_SIZE\}/);
});
