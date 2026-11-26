import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("add a day is one short sheet: name, start from empty or a copy, rest day, Create (SIMPLIFY #9)", () => {
  const source = readFileSync(new URL("./CreateRoutineDayClient.tsx", import.meta.url), "utf8");

  assert.match(source, /Start from/);
  assert.match(source, /label: "Empty"/);
  assert.match(source, /label: "Copy a day"/);
  assert.match(source, /label="Rest day"/);
  assert.match(source, /"Create"/);
  assert.match(source, /Choose Day/);
  assert.doesNotMatch(source, /Manage cycle settings/, "the cycle-settings card is gone");
  assert.doesNotMatch(source, /RoutineChooserOptionCard/, "no Blank/Duplicate cards asked twice");
  assert.match(source, /targetRoutineDayId/);
  assert.match(source, /router\.push\(isTargetMode/);
});
