import assert from "node:assert/strict";
import test from "node:test";

import { resolveExerciseCardThumbSource } from "./exerciseImages.ts";

function withSuppressedMissingIconWarnings<T>(callback: () => T): T {
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    return callback();
  } finally {
    console.warn = originalWarn;
  }
}

test("resolveExerciseCardThumbSource prefers dedicated icon paths over legacy image paths", () => {
  const resolved = resolveExerciseCardThumbSource({
    name: "Bench Press",
    image_icon_path: "/images/bench-icon.png",
    image_path: "/images/bench-instructions.png",
  });

  assert.deepEqual(resolved, {
    src: "/images/bench-icon.png",
    mode: "icon",
  });
});

test("resolveExerciseCardThumbSource prefers generated manifest icons before legacy image paths", () => {
  const resolved = resolveExerciseCardThumbSource({
    name: "Ignore Me",
    slug: "back-squat",
    image_path: "/images/back-squat-howto.png",
  });

  assert.deepEqual(resolved, {
    src: "/exercises/icons/back-squat.png",
    mode: "icon",
  });
});

test("resolveExerciseCardThumbSource normalizes punctuation-heavy names to manifest icon slugs", () => {
  const resolved = resolveExerciseCardThumbSource({
    name: "Dips (Triceps)",
  });

  assert.deepEqual(resolved, {
    src: "/exercises/icons/dips-triceps.png",
    mode: "icon",
  });
});

test("resolveExerciseCardThumbSource normalizes hyphenated names to manifest icon slugs", () => {
  const resolved = resolveExerciseCardThumbSource({
    name: "Single-Arm Lat Pulldown",
  });

  assert.deepEqual(resolved, {
    src: "/exercises/icons/single-arm-lat-pulldown.png",
    mode: "icon",
  });
});

test("resolveExerciseCardThumbSource resolves cardio exercise names through the shared manifest", () => {
  const treadmillRun = resolveExerciseCardThumbSource({
    name: "Treadmill Run",
  });
  const inclineWalk = resolveExerciseCardThumbSource({
    name: "Incline Walk",
  });

  assert.deepEqual(treadmillRun, {
    src: "/exercises/icons/treadmill-run.png",
    mode: "icon",
  });
  assert.deepEqual(inclineWalk, {
    src: "/exercises/icons/incline-walk.png",
    mode: "icon",
  });
});

test("resolveExerciseCardThumbSource keeps explicit custom thumbnails ahead of library defaults", () => {
  const resolved = resolveExerciseCardThumbSource({
    name: "Barbell Bench Press",
    image_icon_path: "/images/custom-bench-thumb.png",
    image_path: "/images/legacy-bench-howto.png",
  });

  assert.deepEqual(resolved, {
    src: "/images/custom-bench-thumb.png",
    mode: "icon",
  });
});

test("resolveExerciseCardThumbSource falls back to the legacy image path as a sprite when no icon exists", () => {
  const resolved = withSuppressedMissingIconWarnings(() => resolveExerciseCardThumbSource({
    name: "Custom Exercise",
    image_path: "/images/custom-howto.png",
  }));

  assert.deepEqual(resolved, {
    src: "/images/custom-howto.png",
    mode: "sprite",
  });
});

test("resolveExerciseCardThumbSource falls back to the placeholder when the manifest and legacy image are both missing", () => {
  const resolved = withSuppressedMissingIconWarnings(() => resolveExerciseCardThumbSource({
    name: "Missing Exercise",
  }));

  assert.deepEqual(resolved, {
    src: "/exercises/icons/_placeholder.svg",
    mode: "placeholder",
  });
});
