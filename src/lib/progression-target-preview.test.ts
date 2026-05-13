import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProgressionTargetPreview,
  buildProgressionTargetPreviewPlan,
  parseProgressionPreviewDurationInput,
} from "@/lib/progression-target-preview";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

function buildStrengthPlan(args: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsTarget: 8,
    repsMin: 8,
    repsMax: 12,
    weightMin: 135,
    weightMax: 135,
    weightUnit: "lbs",
    ...args,
  };
}

function buildTimePlan(args: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "time",
    durationSeconds: 1200,
    ...args,
  };
}

function buildDistancePlan(args: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "distance",
    distance: 2,
    distanceUnit: "mi",
    ...args,
  };
}

test("classic double progression preview shows load increase with rep reset target", () => {
  const preview = buildProgressionTargetPreview({
    plan: buildStrengthPlan({
      repsTarget: 12,
      repsMin: 8,
      repsMax: 12,
    }),
    targetMutation: "increase_load_reset_reps",
    loadStep: 5,
  });

  assert.ok(preview);
  assert.equal(preview.summary, "Next target: 135 lbs x 8–12 -> 140 lbs x 8");
});

test("load + reps preview shows both load and range movement", () => {
  const preview = buildProgressionTargetPreview({
    plan: buildStrengthPlan(),
    targetMutation: "increase_load_and_reps",
    loadStep: 5,
    repStep: 1,
  });

  assert.ok(preview);
  assert.equal(preview.summary, "Next target: 135 lbs x 8–12 -> 140 lbs x 9–13");
});

test("fixed reps preview shows a fixed next target", () => {
  const preview = buildProgressionTargetPreview({
    plan: buildStrengthPlan({
      repsTarget: 8,
      repsMin: 8,
      repsMax: 8,
    }),
    targetMutation: "increase_load_and_reps",
    loadStep: 5,
    repStep: 1,
  });

  assert.ok(preview);
  assert.equal(preview.summary, "Next target: 135 lbs x 8 -> 140 lbs x 9");
});

test("time and distance previews format compact next-target summaries", () => {
  const timePreview = buildProgressionTargetPreview({
    plan: buildTimePlan(),
    targetMutation: "increase_duration",
    durationSecondsStep: 300,
  });
  assert.ok(timePreview);
  assert.equal(timePreview.summary, "Next target: 20 min -> 25 min");

  const distancePreview = buildProgressionTargetPreview({
    plan: buildDistancePlan(),
    targetMutation: "increase_distance",
    distanceStep: 0.5,
  });
  assert.ok(distancePreview);
  assert.equal(distancePreview.summary, "Next target: 2 mi -> 2.5 mi");
});

test("manual target preview stays neutral", () => {
  const preview = buildProgressionTargetPreview({
    plan: buildStrengthPlan(),
    targetMutation: "none",
  });

  assert.ok(preview);
  assert.equal(preview.summary, "Manual review keeps 135 lbs x 8–12.");
});

test("invalid config stays safe and input plans are not mutated", () => {
  const plan = buildStrengthPlan();
  const snapshot = structuredClone(plan);

  const preview = buildProgressionTargetPreview({
    plan,
    targetMutation: "increase_load",
    loadStep: 0,
  });

  assert.equal(preview, null);
  assert.deepEqual(plan, snapshot);
});

test("preview plan builder normalizes editor values safely", () => {
  assert.deepEqual(buildProgressionTargetPreviewPlan({
    measurementType: "time_distance",
    repsMin: null,
    repsMax: null,
    weight: null,
    durationSeconds: parseProgressionPreviewDurationInput("20:30"),
    distance: 2.5,
    distanceUnit: "mi",
  }), {
    measurementType: "time_distance",
    setsMin: null,
    setsMax: null,
    repsTarget: null,
    repsMin: null,
    repsMax: null,
    weightMin: null,
    weightMax: null,
    weightUnit: null,
    durationSeconds: 1230,
    distance: 2.5,
    distanceUnit: "mi",
    calories: null,
  });
});
