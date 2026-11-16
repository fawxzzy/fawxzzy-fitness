import assert from "node:assert/strict";
import test from "node:test";
import { getSessionBackLabel, handleSessionBackClick } from "@/components/sessionBackAction";

function fakeEvent() {
  const event = { prevented: false, preventDefault() { event.prevented = true; } };
  return event;
}

test("with an exercise open, Back closes the exercise and does not leave the workout", () => {
  const event = fakeEvent();
  let closed = 0;
  handleSessionBackClick(event, true, () => { closed += 1; });
  assert.equal(event.prevented, true, "navigation is cancelled");
  assert.equal(closed, 1, "the open exercise is closed");
  assert.equal(getSessionBackLabel(true), "Back to workout");
});

test("with no exercise open, Back is left to navigate away", () => {
  const event = fakeEvent();
  let closed = 0;
  handleSessionBackClick(event, false, () => { closed += 1; });
  assert.equal(event.prevented, false);
  assert.equal(closed, 0);
  assert.equal(getSessionBackLabel(false), "Back");
});

test("without a close handler (offline cached copy), Back always navigates", () => {
  const event = fakeEvent();
  handleSessionBackClick(event, true);
  assert.equal(event.prevented, false);
});

test("two taps with an exercise open: the first closes it, the second leaves", () => {
  let exerciseOpen = true;
  const first = fakeEvent();
  handleSessionBackClick(first, exerciseOpen, () => { exerciseOpen = false; });
  const second = fakeEvent();
  handleSessionBackClick(second, exerciseOpen, () => { exerciseOpen = false; });
  assert.deepEqual([first.prevented, second.prevented], [true, false]);
});
