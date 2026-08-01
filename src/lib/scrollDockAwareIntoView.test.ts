import test from "node:test";
import assert from "node:assert/strict";

import { scrollDockAwareIntoView } from "./scrollDockAwareIntoView.ts";

type FakeRect = { top: number; bottom: number };

function makeFakeElement(rect: FakeRect, scrollTop = 0) {
  return {
    scrollTop,
    getBoundingClientRect: () => rect,
  };
}

// A nested scroll container is any element with its own bounding rect and
// scrollTop, independent of window/document scroll position — these fakes
// deliberately do not use jsdom or a real DOM to prove the helper only ever
// touches the container/target it is given, never `window`.

test("scrolls a container down when the target sits below the visible dock area (exercise near viewport bottom)", () => {
  const container = makeFakeElement({ top: 0, bottom: 500 }, 100);
  const target = makeFakeElement({ top: 480, bottom: 620 });

  scrollDockAwareIntoView(container as unknown as HTMLElement, target as unknown as HTMLElement);

  // target.bottom (620) - visibleBottom (500 - 12 = 488) = 132
  assert.equal(container.scrollTop, 100 + 132);
});

test("scrolls a container up when the target sits above the visible dock area (exercise near viewport top)", () => {
  const container = makeFakeElement({ top: 100, bottom: 700 }, 300);
  const target = makeFakeElement({ top: 40, bottom: 160 });

  scrollDockAwareIntoView(container as unknown as HTMLElement, target as unknown as HTMLElement);

  // target.top (40) - visibleTop (100 + 12 = 112) = -72
  assert.equal(container.scrollTop, 300 - 72);
});

test("does not move the container when the target is already fully within the visible dock area", () => {
  const container = makeFakeElement({ top: 0, bottom: 500 }, 50);
  const target = makeFakeElement({ top: 100, bottom: 200 });

  scrollDockAwareIntoView(container as unknown as HTMLElement, target as unknown as HTMLElement);

  assert.equal(container.scrollTop, 50);
});

test("respects a custom margin", () => {
  const container = makeFakeElement({ top: 0, bottom: 500 }, 0);
  const target = makeFakeElement({ top: 0, bottom: 495 });

  scrollDockAwareIntoView(container as unknown as HTMLElement, target as unknown as HTMLElement, 0);

  assert.equal(container.scrollTop, 0);
});

test("operates purely on the passed-in container, never on window/document globals (safe for a nested scroll container)", () => {
  // This test runs under Node's plain `node --test` runner with no DOM/jsdom
  // available at all (no global `window`/`document`). If the helper reached
  // for those globals instead of the container/target it was given, this
  // test file would fail to even load.
  const container = makeFakeElement({ top: 0, bottom: 300 }, 0);
  const target = makeFakeElement({ top: 350, bottom: 400 });

  scrollDockAwareIntoView(container as unknown as HTMLElement, target as unknown as HTMLElement);

  assert.ok(container.scrollTop > 0);
});
