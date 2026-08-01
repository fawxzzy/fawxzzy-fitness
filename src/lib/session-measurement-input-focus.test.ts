import test from "node:test";
import assert from "node:assert/strict";

import { isTrackedMeasurementInputStillFocused } from "./session-measurement-input-focus.ts";

// Fake DOM nodes: identity is all that matters for this guard, so plain
// objects stand in for HTMLInputElement instances without needing jsdom.
function fakeInput(name: string): EventTarget {
  return { name } as unknown as EventTarget;
}

test("target input focus: scroll is allowed while the target input is still the active element", () => {
  const targetInput = fakeInput("weight");
  assert.equal(isTrackedMeasurementInputStillFocused(targetInput, targetInput), true);
});

test("reps input focus: scroll is allowed while the reps input is still the active element", () => {
  const repsInput = fakeInput("reps");
  assert.equal(isTrackedMeasurementInputStillFocused(repsInput, repsInput), true);
});

test("keyboard-open viewport shrink: still focused on the same input, so the resize handler may re-scroll it", () => {
  const repsInput = fakeInput("reps");
  // Simulates the visualViewport 'resize' firing while the same input is
  // still focused (keyboard finished animating open).
  assert.equal(isTrackedMeasurementInputStillFocused(repsInput, repsInput), true);
});

test("keyboard close: still focused on the same input, so the resize handler may re-settle scroll position", () => {
  const weightInput = fakeInput("weight");
  assert.equal(isTrackedMeasurementInputStillFocused(weightInput, weightInput), true);
});

test("switching between adjacent inputs: a stale tracked reference must not scroll for the newly-focused input", () => {
  const repsInput = fakeInput("reps");
  const weightInput = fakeInput("weight");
  // trackedElement still points at the old input for one tick after blur;
  // activeElement has already moved to the new input.
  assert.equal(isTrackedMeasurementInputStillFocused(weightInput, repsInput), false);
  // Once the tracked ref is updated to the newly-focused input, it resumes.
  assert.equal(isTrackedMeasurementInputStillFocused(weightInput, weightInput), true);
});

test("no focus loss from an unrelated rerender: activeElement is unchanged so the guard keeps allowing scroll", () => {
  const repsInput = fakeInput("reps");
  assert.equal(isTrackedMeasurementInputStillFocused(repsInput, repsInput), true);
  assert.equal(isTrackedMeasurementInputStillFocused(repsInput, repsInput), true);
});

test("blurred with nothing focused: guard blocks scrolling", () => {
  const repsInput = fakeInput("reps");
  assert.equal(isTrackedMeasurementInputStillFocused(null, repsInput), false);
});

test("no tracked element at all: guard blocks scrolling", () => {
  const repsInput = fakeInput("reps");
  assert.equal(isTrackedMeasurementInputStillFocused(repsInput, null), false);
  assert.equal(isTrackedMeasurementInputStillFocused(repsInput, undefined), false);
});
