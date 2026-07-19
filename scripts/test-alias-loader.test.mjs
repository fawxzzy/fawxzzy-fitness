import assert from "node:assert/strict";
import test from "node:test";

import { transpileTypeScriptForTest } from "./test-alias-loader.mjs";

test("test alias loader transpiles TypeScript modules for the Node test runner", () => {
  const output = transpileTypeScriptForTest(
    "export const total: number = 2; export type Marker = { value: number };",
    "fixture.ts",
  );

  assert.match(output, /export const total = 2;/u);
  assert.doesNotMatch(output, /type Marker/u);
  assert.doesNotMatch(output, /: number/u);
});
