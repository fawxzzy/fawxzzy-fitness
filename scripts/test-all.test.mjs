import assert from "node:assert/strict";
import test from "node:test";

import { listTestFiles, loadExclusions, partitionTestFiles } from "./test-all.mjs";

test("every exclusion names an existing test file and gives a reason", () => {
  const files = new Set(listTestFiles());
  const exclusions = loadExclusions();
  const seen = new Set();

  for (const entry of exclusions) {
    assert.ok(files.has(entry.path), `${entry.path} is excluded but is not a test file in the repo; remove the entry`);
    assert.ok(typeof entry.reason === "string" && entry.reason.trim().length >= 20, `${entry.path} needs a real reason`);
    assert.ok(!seen.has(entry.path), `${entry.path} is listed twice`);
    seen.add(entry.path);
  }
});

test("test-all discovers this file and partitions excluded files out of the run list", () => {
  const files = listTestFiles();
  const { run, excluded } = partitionTestFiles(files, loadExclusions());

  assert.ok(run.includes("scripts/test-all.test.mjs"));
  assert.equal(run.length + excluded.length, files.length);
  assert.equal(new Set([...run, ...excluded]).size, files.length);
});

test("partitionTestFiles only removes files named in the exclusion list", () => {
  const { run, excluded } = partitionTestFiles(["a.test.ts", "b.test.ts"], [{ path: "b.test.ts", reason: "x".repeat(20) }]);
  assert.deepEqual(run, ["a.test.ts"]);
  assert.deepEqual(excluded, ["b.test.ts"]);
});
