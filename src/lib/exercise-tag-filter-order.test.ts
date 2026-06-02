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

test("selected Group by options move to the front in selection order", () => {
  const ordered = orderGroupByOptions(options, ["movement", "equipment"]);
  assert.deepEqual(ordered.map((option) => option.key), ["movement", "equipment", "muscle"]);
});

test("Group by clear button appears only when a selection is active", () => {
  assert.equal(hasActiveGroupBySelection([]), false);
  assert.equal(hasActiveGroupBySelection(["movement"]), true);
});

test("Group by clear resets the selection", () => {
  assert.deepEqual(clearGroupBySelection(), []);
  assert.deepEqual(toggleGroupBySelection(["movement"], "movement"), []);
  assert.deepEqual(toggleGroupBySelection([], "movement"), ["movement"]);
  assert.deepEqual(toggleGroupBySelection(["movement"], "equipment"), ["movement", "equipment"]);
});
