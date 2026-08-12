import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/components/ui/BottomSheet.tsx"), "utf8");

test("BottomSheet retains focus entry, containment, Escape, and return-focus contracts", () => {
  assert.match(source, /const FOCUSABLE_SELECTOR = \[/);
  assert.match(source, /function getFocusableSheetElements/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /event\.shiftKey && \(!activeElementIsInsideSheet \|\| activeElement === firstElement\)/);
  assert.match(source, /!event\.shiftKey && \(!activeElementIsInsideSheet \|\| activeElement === lastElement\)/);
  assert.match(source, /previousActiveElementRef\.current\?\.focus\?\.\(\)/);
  assert.match(source, /getFocusableSheetElements\(sheetRef\.current\)\[0\]/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /useReducedMotion\(\)/);
});
