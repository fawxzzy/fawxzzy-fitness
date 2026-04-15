import assert from "node:assert/strict";
import test from "node:test";

import { resolveExerciseThumb } from "./exerciseImages.ts";

function withSuppressedMissingIconWarnings<T>(callback: () => T): T {
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    return callback();
  } finally {
    console.warn = originalWarn;
  }
}

test("resolveExerciseThumb prefers icon sources over legacy image paths", () => {
  const resolved = resolveExerciseThumb({
    name: "Barbell Bench Press",
    iconSrc: "/icons/barbell-bench-press.png",
    imageUrl: "/legacy/bench-press.png",
  });

  assert.deepEqual(resolved, {
    src: "/icons/barbell-bench-press.png",
    mode: "icon",
  });
});

test("resolveExerciseThumb prefers explicit card icons over repo legacy image paths", () => {
  const resolved = resolveExerciseThumb({
    name: "Incline Dumbbell Bench Press",
    cardIconSrc: "/images/custom-incline-thumb.png",
    image_path: "/images/legacy-incline-howto.png",
  });

  assert.deepEqual(resolved, {
    src: "/images/custom-incline-thumb.png",
    mode: "icon",
  });
});

test("resolveExerciseThumb prefers generated manifest icons before legacy image paths", () => {
  const resolved = resolveExerciseThumb({
    name: "Ignore Me",
    slug: "back-squat",
    image_path: "/images/back-squat-howto.png",
  });

  assert.deepEqual(resolved, {
    src: "/exercises/icons/back-squat.png",
    mode: "icon",
  });
});

test("resolveExerciseThumb uses legacy composite art for row cards when a known-bad icon is also present", () => {
  const resolved = resolveExerciseThumb({
    name: "Lateral Raise",
    imageUrl: "/images/lateral-raise-composite.png",
  }, { intent: "row-card" });

  assert.deepEqual(resolved, {
    src: "/images/lateral-raise-composite.png",
    mode: "legacy-composite",
  });
});

test("resolveExerciseThumb keeps exercise-specific icons for row cards when no alternate media exists", () => {
  const barbellBench = resolveExerciseThumb({
    name: "Barbell Bench Press",
  }, { intent: "row-card" });
  const lateralRaise = resolveExerciseThumb({
    name: "Lateral Raise",
  }, { intent: "row-card" });

  assert.deepEqual(barbellBench, {
    src: "/exercises/icons/barbell-bench-press.png",
    mode: "icon",
  });
  assert.deepEqual(lateralRaise, {
    src: "/exercises/icons/lateral-raise.png",
    mode: "icon",
  });
});

test("resolveExerciseThumb normalizes punctuation-heavy names to manifest icon slugs", () => {
  const resolved = resolveExerciseThumb({
    name: "Dips (Triceps)",
  });

  assert.deepEqual(resolved, {
    src: "/exercises/icons/dips-triceps.png",
    mode: "icon",
  });
  const lateralRaise = resolveExerciseThumb({
    name: "Lateral Raise",
  });

  assert.deepEqual(lateralRaise, {
    src: "/exercises/icons/lateral-raise.png",
    mode: "icon",
  });
});

test("resolveExerciseThumb normalizes hyphenated names to manifest icon slugs", () => {
  const resolved = resolveExerciseThumb({
    name: "Single-Arm Lat Pulldown",
  });

  assert.deepEqual(resolved, {
    src: "/exercises/icons/single-arm-lat-pulldown.png",
    mode: "icon",
  });
  const abWheelRollout = resolveExerciseThumb({
    name: "Ab Wheel Rollout",
  });

  assert.deepEqual(abWheelRollout, {
    src: "/exercises/icons/ab-wheel-rollout.png",
    mode: "icon",
  });
});

test("resolveExerciseThumb resolves cardio exercise names through the shared manifest", () => {
  const treadmillRun = resolveExerciseThumb({
    name: "Treadmill Run",
  });
  const inclineWalk = resolveExerciseThumb({
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

test("resolveExerciseThumb keeps explicit custom icons ahead of library defaults", () => {
  const resolved = resolveExerciseThumb({
    name: "Barbell Bench Press",
    image_icon_path: "/images/custom-bench-thumb.png",
    image_path: "/images/legacy-bench-howto.png",
  });

  assert.deepEqual(resolved, {
    src: "/images/custom-bench-thumb.png",
    mode: "icon",
  });
});

test("resolveExerciseThumb prefers thumbnail photos over legacy composite art", () => {
  const resolved = withSuppressedMissingIconWarnings(() => resolveExerciseThumb({
    name: "Photo Exercise",
    thumbnailUrl: "/images/photo-thumb.png",
    imageUrl: "/images/legacy-composite.png",
  }));

  assert.deepEqual(resolved, {
    src: "/images/photo-thumb.png",
    mode: "photo",
  });
});

test("resolveExerciseThumb marks legacy-only image paths as composite", () => {
  const resolved = withSuppressedMissingIconWarnings(() => resolveExerciseThumb({
    name: "Custom Exercise",
    image_path: "/images/custom-howto.png",
  }));

  assert.deepEqual(resolved, {
    src: "/images/custom-howto.png",
    mode: "legacy-composite",
  });
});

test("resolveExerciseThumb marks fallback art when no icon or legacy image exists", () => {
  const resolved = withSuppressedMissingIconWarnings(() => resolveExerciseThumb({
    name: "Missing Exercise",
  }));

  assert.deepEqual(resolved, {
    src: "/exercises/icons/_placeholder.svg",
    mode: "fallback",
  });
});
