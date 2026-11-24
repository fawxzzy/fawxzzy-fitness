import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

// The sheet logic moved to Sheet.tsx (design foundation); BottomSheet.tsx is a thin wrapper over it.
const source = fs.readFileSync(path.resolve(process.cwd(), "src/components/ui/Sheet.tsx"), "utf8");
const wrapper = fs.readFileSync(path.resolve(process.cwd(), "src/components/ui/BottomSheet.tsx"), "utf8");

test("BottomSheet (via Sheet) retains focus entry, containment, Escape, and return-focus contracts", () => {
  assert.match(source, /const FOCUSABLE_SELECTOR = \[/);
  assert.match(source, /function getFocusableSheetElements/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /event\.shiftKey && \(!activeElementIsInsideSheet \|\| activeElement === firstElement\)/);
  assert.match(source, /!event\.shiftKey && \(!activeElementIsInsideSheet \|\| activeElement === lastElement\)/);
  assert.match(source, /previousActiveElementRef\.current\?\.focus\?\.\(\)/);
  assert.match(source, /getFocusableSheetElements\(sheetRef\.current\)\[0\]/);
  assert.match(source, /aria-modal=\{isPresent \? "true" : undefined\}/);
  // A closing sheet stops being a dialog at once (exit animation still playing): no role, aria-hidden, inert.
  assert.match(source, /role=\{isPresent \? "dialog" : undefined\}/);
  assert.match(source, /inert=\{isPresent \? undefined : true\}/);
  assert.match(source, /useReducedMotion\(\)/);
  assert.match(wrapper, /return <Sheet \{\.\.\.props\} eyebrow=\{eyebrow \?\? undefined\} \/>;/);
  // History follow-up: no generic "Sheet" eyebrow by default.
  assert.doesNotMatch(wrapper, /eyebrow = "Sheet"/);
});
