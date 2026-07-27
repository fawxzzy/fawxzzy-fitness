import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const surfaceUrl = new URL("./HistoryCalendarSurface.tsx", import.meta.url);

test("calendar month rail preserves horizontal swipe without blocking vertical page scroll", async () => {
  const source = await readFile(surfaceUrl, "utf8");

  assert.match(source, /\[touch-action:pan-x_pan-y\]/);
  assert.match(source, /\[overscroll-behavior-y:auto\]/);
});

test("calendar exposes distinct training and skipped day states", async () => {
  const source = await readFile(surfaceUrl, "utf8");

  assert.match(source, /data-calendar-day-state=/);
  assert.match(source, /planned workout skipped/);
  assert.match(source, />Skipped<\/span>/);
});
