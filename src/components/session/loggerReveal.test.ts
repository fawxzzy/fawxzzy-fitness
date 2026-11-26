import assert from "node:assert/strict";
import test from "node:test";
import { getLoggerRevealShift } from "./loggerReveal.ts";

test("no shift when Log set already clears the dock", () => {
  assert.equal(getLoggerRevealShift({ actionsBottom: 400, panelTop: 200, visibleTop: 70, visibleBottom: 500 }), 0);
});

test("shifts just enough for Log set to clear the dock, with the margin", () => {
  assert.equal(getLoggerRevealShift({ actionsBottom: 560, panelTop: 300, visibleTop: 70, visibleBottom: 500 }), 68);
});

test("never pushes the logger box above the top of the scroll area", () => {
  // 320x568: the logger is taller than the space left; stop with the panel top at the top edge (+ margin).
  assert.equal(getLoggerRevealShift({ actionsBottom: 900, panelTop: 230, visibleTop: 70, visibleBottom: 500 }), 152);
  assert.equal(getLoggerRevealShift({ actionsBottom: 900, panelTop: 60, visibleTop: 70, visibleBottom: 500 }), 0);
});
