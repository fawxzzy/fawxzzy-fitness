import assert from "node:assert/strict";
import test from "node:test";

import type { ExerciseBrowserRow } from "./exercises-browser.ts";
import {
  buildExerciseIdentityChips,
  buildHistoryExerciseCardViewModel,
  buildHistorySessionCardViewModel,
  buildPlannedExerciseDetailMetrics,
  resolveWorkoutCardPresentationKind,
  buildStrengthVolumeMetric,
  mergeWorkoutCardChips,
} from "./workout-card-view-models.ts";
import type { SessionSummary } from "@/app/history/session-summary";

function makeExerciseBrowserRow(overrides: Partial<ExerciseBrowserRow> = {}): ExerciseBrowserRow {
  return {
    exerciseId: "exercise-1",
    name: "Exercise",
    slug: "exercise",
    image_path: null,
    image_icon_path: null,
    image_howto_path: null,
    how_to_short: null,
    primary_muscle: null,
    equipment: null,
    movement_pattern: null,
    last_performed_at: null,
    last_weight: null,
    last_reps: null,
    last_unit: null,
    pr_weight: null,
    pr_reps: null,
    pr_est_1rm: null,
    actual_pr_weight: null,
    actual_pr_reps: null,
    actual_pr_at: null,
    kind: "strength",
    lastSummary: null,
    bestSummary: null,
    prLabel: "",
    prCount: 0,
    sessionCount: 0,
    deltaFromBest: null,
    tagsSummary: null,
    ...overrides,
  };
}

function makeSessionSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: "session-1",
    startedAt: "2026-05-01T12:00:00.000Z",
    routineTitle: "Lower Rotation",
    dayTitle: "Day 1",
    exerciseNames: ["Back Squat", "RDL"],
    prExerciseNames: [],
    durationSec: 2700,
    exerciseCount: 2,
    setCount: 6,
    repCount: 30,
    prCounts: { weight: 0, reps: 0, total: 0 },
    prLabel: "",
    totalVolume: 5400,
    volumeUnit: "lbs",
    completionRate: 1,
    hasNote: false,
    hasSetData: true,
    ...overrides,
  };
}

test("buildExerciseIdentityChips preserves taxonomy order and compact clamping", () => {
  const detailed = buildExerciseIdentityChips({
    measurementType: "reps",
    equipment: "barbell",
    movementPattern: "squat",
    primaryMuscle: "quads",
  });
  const compact = buildExerciseIdentityChips({
    measurementType: "reps",
    equipment: "barbell",
    movementPattern: "squat",
    primaryMuscle: "quads",
  }, { maxChips: 2 });

  assert.deepEqual(detailed.map((chip) => chip.label), ["Strength", "Barbell", "Squat"]);
  assert.deepEqual(compact.map((chip) => chip.label), ["Strength", "Barbell"]);
});

test("buildExerciseIdentityChips falls back to primary muscle when metadata is sparse", () => {
  const chips = buildExerciseIdentityChips({
    measurementType: "reps",
    equipment: "barbell",
    movementPattern: null,
    primaryMuscle: "quads",
  });

  assert.deepEqual(chips.map((chip) => chip.label), ["Strength", "Barbell", "Quads"]);
});

test("buildExerciseIdentityChips stays empty when no identity signal exists", () => {
  const chips = buildExerciseIdentityChips({});

  assert.deepEqual(chips, []);
});

test("buildExerciseIdentityChips gives Stretch a dedicated hub identity", () => {
  const chips = buildExerciseIdentityChips({
    name: "Stretch",
    slug: "stretch",
    primaryMuscle: "recovery",
    equipment: "bodyweight",
    movementPattern: "mobility",
  });

  assert.deepEqual(chips.map((chip) => chip.label), ["Mobility", "Recovery", "Bodyweight"]);
});

test("resolveWorkoutCardPresentationKind keeps cardio, bodyweight, and timed buckets distinct", () => {
  assert.equal(resolveWorkoutCardPresentationKind({
    measurementType: "reps",
    equipment: "Barbell",
    movementPattern: "Squat",
  }), "strength");

  assert.equal(resolveWorkoutCardPresentationKind({
    measurementType: "time_distance",
    primaryMuscle: "Cardio",
    equipment: "Treadmill",
  }), "cardio");

  assert.equal(resolveWorkoutCardPresentationKind({
    measurementType: "reps",
    equipment: "Bodyweight",
    movementPattern: "Vertical Pull",
  }), "bodyweight");

  assert.equal(resolveWorkoutCardPresentationKind({
    measurementType: "time",
    equipment: "Bodyweight",
    movementPattern: "Brace",
  }), "timed");
});

test("mergeWorkoutCardChips dedupes labels and respects the shared max-chip cap", () => {
  const merged = mergeWorkoutCardChips(
    [{ label: "Strength" }, { label: "Barbell" }],
    [{ label: "Barbell" }, { label: "Squat" }],
    [{ label: "Logged" }],
  );

  assert.deepEqual(merged.map((chip) => chip.label), ["Strength", "Barbell", "Squat"]);
});

test("buildPlannedExerciseDetailMetrics keeps the shared ready-state metric row shape", () => {
  const metrics = buildPlannedExerciseDetailMetrics({
    measurementType: "reps",
    equipment: "barbell",
    movementPattern: "squat",
    targetSetsMin: 4,
    targetSetsMax: 4,
  });

  assert.deepEqual(metrics.map((metric) => metric.label), ["Status", "Next", "Tracking"]);
  assert.equal(metrics[0]?.value, "Ready");
  assert.equal(metrics[1]?.value, "4 sets planned");
  assert.equal(metrics[2]?.value, "Reps + Load");
});

test("buildPlannedExerciseDetailMetrics swaps to logged progress without changing row order", () => {
  const metrics = buildPlannedExerciseDetailMetrics({
    measurementType: "time_distance",
    equipment: "treadmill",
    movementPattern: "gait",
    loggedSetCount: 1,
    targetSetsMin: 1,
    targetSetsMax: 1,
  });

  assert.deepEqual(metrics.map((metric) => metric.label), ["Logged", "Next", "Tracking"]);
  assert.equal(metrics[0]?.value, "1 of 1");
  assert.equal(metrics[1]?.value, "1 effort planned");
  assert.equal(metrics[2]?.value, "Time + Distance");
});

test("buildPlannedExerciseDetailMetrics keeps skipped cards to next and tracking only", () => {
  const metrics = buildPlannedExerciseDetailMetrics({
    measurementType: "time",
    equipment: "bodyweight",
    movementPattern: "brace",
    isSkipped: true,
    targetSetsMin: 3,
    targetSetsMax: 3,
  });

  assert.deepEqual(metrics.map((metric) => metric.label), ["Next", "Tracking"]);
  assert.equal(metrics[0]?.value, "3 efforts planned");
  assert.equal(metrics[1]?.value, "Time");
});

test("buildPlannedExerciseDetailMetrics gives Stretch a reference-only metric set", () => {
  const metrics = buildPlannedExerciseDetailMetrics({
    name: "Stretch",
    slug: "stretch",
    primaryMuscle: "recovery",
    equipment: "bodyweight",
    movementPattern: "mobility",
  });

  assert.deepEqual(metrics, []);
});

test("buildHistoryExerciseCardViewModel keeps bodyweight history cards on the shared identity and metric contract", () => {
  const viewModel = buildHistoryExerciseCardViewModel(makeExerciseBrowserRow({
    name: "Pull-Up",
    equipment: "Pull-Up Bar",
    movement_pattern: "Vertical Pull",
    primary_muscle: "Back",
    last_performed_at: "2026-04-08T13:00:00.000Z",
    last_weight: 0,
    last_reps: 9,
    actual_pr_weight: 0,
    actual_pr_reps: 12,
    kind: "strength",
    lastSummary: "9 reps",
    bestSummary: "Best: 12 reps",
    prLabel: "Rep PR",
    prCount: 1,
    sessionCount: 9,
    sessionsLast30Days: 5,
    activityRank: 4,
    deltaFromBest: "-3 reps vs best",
  }));

  assert.equal(viewModel.presentationKind, "bodyweight");
  assert.equal(viewModel.semanticTone, "logged");
  assert.equal(viewModel.comparison, "-3 reps vs best");
  assert.equal(viewModel.badgeText, "Top 5");
  assert.deepEqual(viewModel.badgeItems, ["Top 5", "5 recent", "1 PR", "9 Sessions"]);
  assert.deepEqual(viewModel.chips.map((chip) => chip.label), ["Bodyweight", "Pull Up Bar", "Vertical Pull"]);
  assert.deepEqual(viewModel.detailedMetrics.map((metric) => metric.label), ["Sessions", "Sets", "Recent", "PRs"]);
  assert.deepEqual(viewModel.detailedSections.map((section) => section.title), ["Last", "Best", "Progress"]);
  assert.deepEqual(viewModel.detailedSections[2]?.items, ["-3 reps vs best"]);
});

test("buildHistoryExerciseCardViewModel keeps cardio history cards on the shared identity and metric contract", () => {
  const viewModel = buildHistoryExerciseCardViewModel(makeExerciseBrowserRow({
    name: "Incline Walk",
    equipment: "Treadmill",
    movement_pattern: "Gait",
    primary_muscle: "Cardio",
    last_performed_at: "2026-04-09T13:00:00.000Z",
    kind: "cardio",
    lastSummary: "22m | 1.7 mi | 12:56/mi",
    bestSummary: "Best: 2.1 mi",
    sessionCount: 12,
    sessionsLast30Days: 6,
    detailedMetrics: [
      { label: "Sessions", value: "12" },
      { label: "Sets", value: "12" },
      { label: "Recent", value: "6", timeframe: "recent window" },
      { label: "Tracked", value: "Time + Dist + Cal" },
    ],
    detailSections: [
      {
        title: "Last",
        items: ["Time: 22:00", "Distance: 1.7 mi", "Pace: 12:56/mi", "Calories: 240 cal"],
      },
      {
        title: "Best",
        items: ["Distance: 2.1 mi", "Pace: 12:22/mi"],
      },
      {
        title: "Progress",
        items: ["-0.4mi vs best", "Distance: +0.2 mi vs previous"],
      },
    ],
    deltaFromBest: "-0.4mi vs best",
  }));

  assert.equal(viewModel.presentationKind, "cardio");
  assert.equal(viewModel.semanticTone, "logged");
  assert.equal(viewModel.comparison, "-0.4mi vs best");
  assert.deepEqual(viewModel.chips.map((chip) => chip.label), ["Cardio", "Treadmill", "Gait"]);
  assert.deepEqual(viewModel.detailedMetrics.map((metric) => metric.label), ["Sessions", "Sets", "Recent", "Tracked"]);
  assert.deepEqual(viewModel.detailedSections[0]?.items, ["Time: 22:00", "Distance: 1.7 mi", "Pace: 12:56/mi", "Calories: 240 cal"]);
  assert.deepEqual(viewModel.detailedSections[1]?.items, ["Distance: 2.1 mi", "Pace: 12:22/mi"]);
  assert.deepEqual(viewModel.detailedSections[2]?.items, ["-0.4mi vs best", "Distance: +0.2 mi vs previous"]);
});

test("buildHistoryExerciseCardViewModel supports step-based cardio wording", () => {
  const viewModel = buildHistoryExerciseCardViewModel(makeExerciseBrowserRow({
    name: "Incline Walk",
    kind: "cardio",
    equipment: "Treadmill",
    movement_pattern: "Gait",
    lastSummary: "22:00 | 5000 steps",
    bestSummary: "Best: 6200 steps",
    detailSections: [
      {
        title: "Last",
        items: ["Time: 22:00", "Steps: 5000 steps", "Calories: 240 cal"],
      },
      {
        title: "Best",
        items: ["Steps: 6200 steps"],
      },
      {
        title: "Progress",
        items: ["-1200steps vs best", "Steps: +400 steps vs previous"],
      },
    ],
    detailedMetrics: [
      { label: "Sessions", value: "12" },
      { label: "Sets", value: "12" },
      { label: "Recent", value: "6", timeframe: "recent window" },
      { label: "Tracked", value: "Time + Steps + Cal" },
    ],
  }));

  assert.deepEqual(viewModel.detailedMetrics.map((metric) => metric.label), ["Sessions", "Sets", "Recent", "Tracked"]);
  assert.equal(viewModel.detailedMetrics[3]?.value, "Time + Steps + Cal");
  assert.deepEqual(viewModel.detailedSections[0]?.items, ["Time: 22:00", "Steps: 5000 steps", "Calories: 240 cal"]);
  assert.deepEqual(viewModel.detailedSections[1]?.items, ["Steps: 6200 steps"]);
  assert.deepEqual(viewModel.detailedSections[2]?.items, ["-1200steps vs best", "Steps: +400 steps vs previous"]);
});

test("buildHistoryExerciseCardViewModel treats timed holds as their own review family", () => {
  const viewModel = buildHistoryExerciseCardViewModel(makeExerciseBrowserRow({
    name: "Plank",
    kind: "cardio",
    measurement_type: "time",
    equipment: "bodyweight",
    movement_pattern: "brace",
    primary_muscle: "core",
    lastSummary: "2:00",
    bestSummary: "Best: 3:00",
    sessionCount: 8,
    setCount: 12,
    sessionsLast30Days: 4,
  }));

  assert.equal(viewModel.presentationKind, "timed");
  assert.deepEqual(viewModel.chips.map((chip) => chip.label), ["Timed", "Bodyweight", "Brace"]);
  assert.deepEqual(viewModel.detailedMetrics.map((metric) => metric.label), ["Sessions", "Sets", "Active", "Tracked"]);
  assert.equal(viewModel.detailedMetrics[3]?.value, "Time");
  assert.deepEqual(viewModel.detailedSections[0]?.items, ["2:00"]);
  assert.deepEqual(viewModel.detailedSections[1]?.items, ["3:00"]);
});

test("buildHistoryExerciseCardViewModel gives Stretch a library-first history card", () => {
  const viewModel = buildHistoryExerciseCardViewModel(makeExerciseBrowserRow({
    name: "Stretch",
    slug: "stretch",
    primary_muscle: "recovery",
    equipment: "bodyweight",
    movement_pattern: "mobility",
    kind: "strength",
  }));

  assert.equal(viewModel.summaryLabel, "");
  assert.deepEqual(viewModel.chips.map((chip) => chip.label), ["Mobility", "Recovery", "Bodyweight"]);
  assert.deepEqual(viewModel.badgeItems, []);
  assert.deepEqual(viewModel.detailedMetrics, []);
  assert.deepEqual(viewModel.detailedSections, []);
});

test("buildStrengthVolumeMetric preserves fitness-native unit wording", () => {
  const now = new Date().toISOString();
  const fortyDaysAgo = new Date(Date.now() - (40 * 24 * 60 * 60 * 1000)).toISOString();

  const metric = buildStrengthVolumeMetric([
    { weight: 225, reps: 5, performedAt: now },
    { weight: 185, reps: 8, performedAt: now },
    { weight: 315, reps: 2, performedAt: fortyDaysAgo },
  ], 28, "lb");

  assert.equal(metric, "2,605 lbs");
});

test("buildHistoryExerciseCardViewModel falls back to the last-performed marker when no best delta exists", () => {
  const viewModel = buildHistoryExerciseCardViewModel(makeExerciseBrowserRow({
    name: "Barbell Row",
    equipment: "Barbell",
    movement_pattern: "Pull",
    primary_muscle: "Back",
    last_performed_at: "2026-04-10T13:00:00.000Z",
    kind: "strength",
    lastSummary: "185lbsx8",
    sessionCount: 4,
  }));

  assert.equal(viewModel.comparison, "Last Apr 10");
  assert.deepEqual(viewModel.badgeItems, ["4 Sessions", "Last Apr 10"]);
  assert.deepEqual(viewModel.detailedSections[2]?.items, ["Last trained Apr 10"]);
});

test("buildHistoryExerciseCardViewModel promotes the top activity badge into plain language", () => {
  const viewModel = buildHistoryExerciseCardViewModel(makeExerciseBrowserRow({
    name: "Treadmill Run",
    kind: "cardio",
    activityRank: 1,
    sessionCount: 19,
    sessionsLast30Days: 11,
    lastSummary: "3:00",
    bestSummary: "Best: 9:00",
  }));

  assert.equal(viewModel.badgeText, "Most Trained");
  assert.deepEqual(viewModel.badgeItems, ["Most Trained", "11 recent", "19 Sessions"]);
  assert.equal(viewModel.detailedMetrics[2]?.label, "Recent");
  assert.equal(viewModel.detailedMetrics[2]?.value, "11");
});

test("buildHistorySessionCardViewModel favors PR progress language when a session hits PRs", () => {
  const viewModel = buildHistorySessionCardViewModel(makeSessionSummary({
    prCounts: { weight: 1, reps: 1, total: 2 },
    bestLift: {
      exerciseName: "Back Squat",
      display: "315 lbs x 5",
    },
  }));

  assert.equal(viewModel.outcome, "Best: Back Squat | 315 lbs x 5");
  assert.equal(viewModel.progress, "2 PRs this session");
  assert.deepEqual(viewModel.compactChips.map((chip) => chip.label), ["45m", "6 sets", "2 PRs this session"]);
  assert.deepEqual(viewModel.detailedMetrics.map((metric) => metric.label), ["Exercises", "Sets", "Duration", "Completion"]);
});

test("buildHistorySessionCardViewModel falls back to completion delta when there are no PRs", () => {
  const current = makeSessionSummary({
    totalVolume: 6000,
    completionRate: 0.9,
  });
  const previous = makeSessionSummary({
    id: "session-0",
    totalVolume: 5400,
    completionRate: 0.8,
  });

  const viewModel = buildHistorySessionCardViewModel(current, previous);

  assert.equal(viewModel.progress, "+10% completion");
  assert.deepEqual(viewModel.compactChips.map((chip) => chip.label), ["45m", "6 sets", "+10% completion"]);
});
