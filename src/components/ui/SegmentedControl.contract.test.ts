import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("SegmentedControl keeps a client boundary for interactive tab controls", () => {
  const source = readFileSync(new URL("./SegmentedControl.tsx", import.meta.url), "utf8");
  const firstStatement = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  assert.equal(firstStatement, '"use client";');
});
