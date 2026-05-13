import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = readFileSync(
  path.join(process.cwd(), "src/components/routines/ProgressionPlaybookEditor.tsx"),
  "utf8",
);

test("ProgressionPlaybookEditor renders focus rotation controls and uses shared seed helpers", () => {
  assert.match(source, /Training focus for this day/);
  assert.match(source, /buildFocusTargetSeed/);
  assert.match(source, /buildTargetSnapshotFromPlan/);
  assert.match(source, /progressionFocusRotation/);
});
