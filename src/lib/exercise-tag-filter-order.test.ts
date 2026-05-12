import test from "node:test";
import assert from "node:assert/strict";

import {
  clearGroupBySelection,
  hasActiveGroupBySelection,
  orderGroupByOptions,
  toggleGroupBySelection,
} from "./exercise-tag-filter-order.ts";

const options = [
  { key: "equipment", label: "Equipment" },
  { key: "movement", label: "Movement" },
  { key: "muscle", label: "Muscle" },
];

test("selected Group by option moves to the front", () => {
  const ordered = orderGroupByOptions(options, "movement");
  assert.deepEqual(ordered.map((option) => option.key), ["movement", "equipment", "muscle"]);
});

test("Group by clear button appears only when a selection is active", () => {
  assert.equal(hasActiveGroupBySelection(null), false);
  assert.equal(hasActiveGroupBySelection("movement"), true);
});

test("Group by clear resets the selection", () => {
  assert.equal(clearGroupBySelection(), null);
  assert.equal(toggleGroupBySelection("movement", "movement"), null);
  assert.equal(toggleGroupBySelection(null, "movement"), "movement");
});
