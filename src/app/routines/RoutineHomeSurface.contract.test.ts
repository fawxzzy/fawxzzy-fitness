import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("routine home keeps inline reorder (pointer drag plus keyboard) and the add-day modal flow on the routine surface", () => {
  const source = readFileSync(new URL("./RoutineHomeClient.tsx", import.meta.url), "utf8");

  assert.match(source, /<DragHandle/);
  assert.match(source, /label=\{`Reorder \$\{dayLabel\}`\}/);
  assert.match(source, /onMove=\{\(direction\) => handleMoveDayByStep\(day\.id, direction\)\}/);
  assert.match(source, /onPointerDown=\{\(event\) => handleReorderHandlePointerDown\(day\.id, event\)\}/);
  assert.match(source, /data-routine-day-id=\{day\.id\}/);
  assert.match(source, /orderedRoutineDayIds/);
  assert.match(source, /Add Day/);
  assert.match(source, /Blank day/);
  assert.match(source, /Duplicate day/);
  assert.match(source, /Choose Day/);
});

test("routine home day cards use the card system: toggle header, action row inside the card, no corner Delete", () => {
  const source = readFileSync(new URL("./RoutineHomeClient.tsx", import.meta.url), "utf8");

  assert.match(source, /<RoutineOverviewDayCard/);
  assert.match(source, /interaction="toggle"/);
  assert.match(source, /<CardActionFrame/);
  assert.match(source, /data-card-action="delete"/);
  assert.doesNotMatch(source, /routine-card-delete|ROUTINE_CARD_DELETE|ReorderHandleGlyph|HorizontalScrollHint|MetricAccentBar|AttachedCardActionStripFrame/);
});

test("routine home day-card copy uses the canonical term day, and the day label comes from the shared heading rule", () => {
  const source = readFileSync(new URL("./RoutineHomeClient.tsx", import.meta.url), "utf8");

  assert.match(source, /title="Delete day\?"/);
  assert.match(source, /"Day deleted\."/);
  assert.match(source, /"Day order updated\."/);
  assert.match(source, /"Could not reorder days\."/);
  assert.match(source, /getRoutineDayHeading\(/);
  assert.doesNotMatch(source, /Delete workout plan\?|Workout plan deleted|Workout plan order updated|getRoutineDayEditableName/);
});
