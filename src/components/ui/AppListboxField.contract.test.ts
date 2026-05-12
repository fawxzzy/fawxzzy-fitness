import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("filter listbox dropdown surface uses 95 percent alpha", () => {
  const source = readFileSync(new URL("./AppListboxField.tsx", import.meta.url), "utf8");

  assert.match(source, /rgba\(var\(--surface-rgb\),0\.95\)/);
});
