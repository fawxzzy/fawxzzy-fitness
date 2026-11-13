import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const surfaceUrl = new URL("./HistoryCalendarSurface.tsx", import.meta.url);

test("calendar shows one month at a time with 44px day cells instead of a sideways month rail", async () => {
  const source = await readFile(surfaceUrl, "utf8");

  assert.doesNotMatch(source, /HorizontalScrollHint|min-w-max|touch-action/);
  assert.match(source, /data-calendar-nav="older"/);
  assert.match(source, /data-calendar-nav="newer"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /flex h-11 min-w-0 flex-col/);
});

test("calendar exposes distinct training and skipped day states", async () => {
  const source = await readFile(surfaceUrl, "utf8");

  assert.match(source, /data-calendar-day-state=/);
  assert.match(source, /planned workout skipped/);
  assert.match(source, />Skipped<\/span>/);
});
