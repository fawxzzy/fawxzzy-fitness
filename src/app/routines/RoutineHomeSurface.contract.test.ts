import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("routine home keeps inline reorder handles and the add-day modal flow on the routine surface", () => {
  const source = readFileSync(new URL("./RoutineHomeClient.tsx", import.meta.url), "utf8");
  const cardPresentationSource = readFileSync(new URL("../../components/day-list/RoutineDayCardPresentation.tsx", import.meta.url), "utf8");

  assert.match(source, /title="Drag to reorder"/);
  assert.match(source, /routineEditorHandleGlyph/);
  assert.match(source, /!h-7 !w-12 !rounded-full/);
  assert.match(cardPresentationSource, /ROUTINE_REST_DAY_CARD_BODY_CLASS_NAME = "!min-h-\[3\.6rem\]/);
  assert.match(cardPresentationSource, /ROUTINE_REST_DAY_CARD_RIGHT_RAIL_CLASS_NAME = "!right-\[0\.28rem\] !bottom-\[0\.28rem\]/);
  assert.match(cardPresentationSource, /contentVerticalAlign=\{day\.isRest \? "top"/);
  assert.match(source, /orderedRoutineDayIds/);
  assert.match(source, /Add Day/);
  assert.match(source, /Blank workout plan/);
  assert.match(source, /Duplicate workout plan/);
  assert.match(source, /Choose Workout Plan/);
});
