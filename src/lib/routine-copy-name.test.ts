import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveUniqueRoutineCopyName,
  ROUTINE_COPY_NAME_MAX_LENGTH,
} from "./routine-copy-name.ts";

test("resolveUniqueRoutineCopyName keeps a requested name when it is unused", () => {
  assert.equal(resolveUniqueRoutineCopyName({
    sourceName: "Push",
    requestedName: "Custom Split",
    existingNames: ["Push", "Pull"],
  }), "Custom Split");
});

test("resolveUniqueRoutineCopyName appends a numeric suffix when the source name already exists", () => {
  assert.equal(resolveUniqueRoutineCopyName({
    sourceName: "Push",
    requestedName: "",
    existingNames: ["Push"],
  }), "Push 2");
});

test("resolveUniqueRoutineCopyName skips taken suffixes and compares names case-insensitively", () => {
  assert.equal(resolveUniqueRoutineCopyName({
    sourceName: "Push",
    requestedName: " push ",
    existingNames: ["Push", "push 2", "PUSH 3"],
  }), "push 4");
});

test("resolveUniqueRoutineCopyName trims long base names so suffixed copies still fit the cap", () => {
  const result = resolveUniqueRoutineCopyName({
    sourceName: "Very Long Routine Name",
    requestedName: "",
    existingNames: ["Very Long Routi", "Very Long Rou 2"],
  });

  assert.equal(result, "Very Long Rou 3");
  assert.ok(result.length <= ROUTINE_COPY_NAME_MAX_LENGTH);
});

test("resolveUniqueRoutineCopyName falls back to a routine label when source and requested names are empty", () => {
  assert.equal(resolveUniqueRoutineCopyName({
    sourceName: "   ",
    requestedName: "",
    existingNames: ["Routine"],
  }), "Routine 2");
});
