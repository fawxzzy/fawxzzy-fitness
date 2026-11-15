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

test("page-switching links render as navigation with aria-current, not as tabs without tabpanels", () => {
  const source = readFileSync(new URL("./SegmentedControl.tsx", import.meta.url), "utf8");
  assert.match(source, /const isNavigation = !onChange && options\.length > 0 && options\.every\(\(option\) => Boolean\(option\.href\)\)/);
  assert.match(source, /const ShellTag = isNavigation \? "nav" : "div"/);
  assert.match(source, /role=\{isNavigation \? undefined : "tablist"\}/);
  assert.match(source, /aria-current=\{isNavigation && isActive \? "page" : undefined\}/);
});

test("the History density toggle uses one static label with aria-pressed", () => {
  const source = readFileSync(new URL("../history/HistoryHeaderDensityToggle.tsx", import.meta.url), "utf8");
  assert.match(source, /const label = "Show detailed rows";/);
  assert.match(source, /aria-pressed=\{showingDetails\}/);
  assert.doesNotMatch(source, /Show compact rows/);
});
