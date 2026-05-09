import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProgressionHistorySessions,
  deriveProgressionReviewCandidate,
  deriveProgressionPlaybookTarget,
  getCycleDayIndex,
  getDefaultProgressionLayerModel,
  getProgressionStepLabel,
  listProgressionMethodDefinitions,
  listSetFlowDefinitions,
  normalizeProgressionMethodLayerId,
  PROGRESSION_INFO_TERM_DEFINITIONS,
  validateProgressionPlaybookSelection,
  type ProgressionHistorySetRow,
  type ProgressionTargetPlan,
} from "@/lib/progression-playbooks";

function buildPlan(overrides: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsMin: 8,
    repsMax: 10,
    weightMin: 100,
    weightMax: 100,
    weightUnit: "lbs",
    ...overrides,
  };
}

function buildHistoryRows(args: {
  sessionId: string;
  performedAt: string;
  reps: number[];
  weight?: number;
  weightUnit?: "lbs" | "kg";
  isWarmup?: boolean;
}): ProgressionHistorySetRow[] {
  return args.reps.map((reps, index) => ({
    sessionId: args.sessionId,
    performedAt: args.performedAt,
    setIndex: index + 1,
    reps,
    weight: args.weight ?? 100,
    weightUnit: args.weightUnit ?? "lbs",
    isWarmup: args.isWarmup ?? false,
  }));
}

function buildCardioHistoryRows(args: {
  sessionId?: string;
  performedAt?: string;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: "mi" | "km" | "m" | null;
}): ProgressionHistorySetRow[] {
  return [{
    sessionId: args.sessionId ?? "cardio-session-1",
    performedAt: args.performedAt ?? "2026-05-04T10:00:00.000Z",
    setIndex: 1,
    reps: null,
    weight: null,
    weightUnit: null,
    durationSeconds: args.durationSeconds ?? null,
    distance: args.distance ?? null,
    distanceUnit: args.distanceUnit ?? null,
    calories: null,
    isWarmup: false,
  }];
}

test("double progression raises load only after every target set reaches the top rep", () => {
  const history = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [10, 10, 10],
      weight: 100,
    }),
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const target = deriveProgressionPlaybookTarget({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan(),
    history,
    fallbackWeightUnit: "lbs",
  });

  assert.ok(target);
  assert.equal(target.playbookId, "double_progression");
  assert.equal(target.changed, true);
  assert.equal(target.plan.weightMin, 105);
  assert.equal(target.plan.repsTarget, 8);
  assert.equal(target.plan.repsMin, 8);
  assert.equal(target.plan.repsMax, 10);
});

test("double progression suggests rep growth at the same load before top rep completion", () => {
  const history = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [8, 8, 8],
      weight: 100,
    }),
    targetSetCount: 3,
    topRepTarget: 8,
  });

  const target = deriveProgressionPlaybookTarget({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan({ repsTarget: 8 }),
    history,
    fallbackWeightUnit: "lbs",
  });

  assert.ok(target);
  assert.equal(target.playbookId, "double_progression");
  assert.equal(target.changed, true);
  assert.equal(target.plan.weightMin, 100);
  assert.equal(target.plan.repsTarget, 9);
  assert.equal(target.plan.repsMin, 8);
  assert.equal(target.plan.repsMax, 10);
  assert.match(target.reason, /build reps/i);
});

test("progression review builds reps at the applied load before the next load bump", () => {
  const rows = buildHistoryRows({
    sessionId: "bench-230x4",
    performedAt: "2026-05-04T10:00:00.000Z",
    reps: [4, 4, 4],
    weight: 230,
  });
  const history = buildProgressionHistorySessions({
    rows,
    targetSetCount: 3,
    topRepTarget: 4,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan({
      setsMin: 3,
      setsMax: 3,
      repsTarget: 4,
      repsMin: 4,
      repsMax: 6,
      weightMin: 230,
      weightMax: 230,
    }),
    history,
    historyRows: rows,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "promote");
  assert.equal(candidate.currentTarget?.repsTarget, 4);
  assert.equal(candidate.proposedTarget?.weightMin, 230);
  assert.equal(candidate.proposedTarget?.repsTarget, 5);
  assert.equal(candidate.proposedTarget?.repsMin, 4);
  assert.equal(candidate.proposedTarget?.repsMax, 6);
  assert.match(candidate.reason, /target reps complete/i);
});

test("progression review bumps load after the rep phase reaches the range top", () => {
  const rows = buildHistoryRows({
    sessionId: "bench-230x6",
    performedAt: "2026-05-04T10:00:00.000Z",
    reps: [6, 6, 6],
    weight: 230,
  });
  const history = buildProgressionHistorySessions({
    rows,
    targetSetCount: 3,
    topRepTarget: 6,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan({
      setsMin: 3,
      setsMax: 3,
      repsTarget: 6,
      repsMin: 4,
      repsMax: 6,
      weightMin: 230,
      weightMax: 230,
    }),
    history,
    historyRows: rows,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "promote");
  assert.equal(candidate.proposedTarget?.weightMin, 235);
  assert.equal(candidate.proposedTarget?.repsTarget, 4);
  assert.equal(candidate.proposedTarget?.repsMin, 4);
  assert.equal(candidate.proposedTarget?.repsMax, 6);
  assert.match(candidate.reason, /increase load/i);
});


test("fixed-load rep range builds reps while holding load", () => {
  const history = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [8, 8, 8],
      weight: 100,
    }),
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const target = deriveProgressionPlaybookTarget({
    playbookId: "fixed_load_rep_range_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan(),
    history,
    fallbackWeightUnit: "lbs",
  });

  assert.ok(target);
  assert.equal(target.playbookId, "fixed_load_rep_range_progression");
  assert.equal(target.plan.weightMin, 100);
  assert.equal(target.plan.repsMin, 9);
  assert.equal(target.plan.repsMax, 9);
  assert.match(target.reason, /hold load/i);
});

test("fixed-load range completion holds load and returns review copy instead of bumping weight", () => {
  const history = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [10, 10, 10],
      weight: 100,
    }),
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const target = deriveProgressionPlaybookTarget({
    playbookId: "fixed_load_rep_range_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan(),
    history,
    fallbackWeightUnit: "lbs",
  });

  assert.ok(target);
  assert.equal(target.changed, false);
  assert.equal(target.plan.weightMin, 100);
  assert.equal(target.plan.weightMax, 100);
  assert.equal(target.plan.repsMin, 8);
  assert.equal(target.plan.repsMax, 10);
  assert.match(target.reason, /review before increasing/i);
});

test("progression review creates promote candidate for double progression top range", () => {
  const history = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [10, 10, 10],
      weight: 100,
    }),
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan(),
    history,
    fallbackWeightUnit: "lbs",
    cycleWindow: { startDate: "2026-05-04", endDate: "2026-05-10" },
  });

  assert.equal(candidate.type, "promote");
  assert.equal(candidate.proposedTarget?.weightMin, 105);
  assert.equal(candidate.proposedTarget?.repsMin, 8);
  assert.equal(candidate.cycleWindow?.startDate, "2026-05-04");
  assert.match(candidate.reason, /increase load next cycle/i);
});

test("progression review counts above-target load when all checked sets hit top reps", () => {
  const rows = buildHistoryRows({
    sessionId: "session-1",
    performedAt: "2026-05-04T10:00:00.000Z",
    reps: [8, 8, 8],
    weight: 30,
  });
  const history = buildProgressionHistorySessions({
    rows,
    targetSetCount: 3,
    topRepTarget: 8,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan({
      setsMin: 3,
      setsMax: 3,
      repsMin: 6,
      repsMax: 8,
      weightMin: 25,
      weightMax: 25,
    }),
    history,
    historyRows: rows,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "promote");
  assert.equal(candidate.currentTarget?.weightMin, 25);
  assert.equal(candidate.proposedTarget?.weightMin, 35);
});

test("progression review promotes Lateral Raise when logged load is above target and all top reps qualify", () => {
  const rows = buildHistoryRows({
    sessionId: "lateral-raise-session",
    performedAt: "2026-04-16T10:00:00.000Z",
    reps: [8, 8, 8],
    weight: 30,
  });
  const history = buildProgressionHistorySessions({
    rows,
    targetSetCount: 3,
    topRepTarget: 8,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan({
      setsMin: 3,
      setsMax: 3,
      repsMin: 8,
      repsMax: 8,
      weightMin: 25,
      weightMax: 25,
    }),
    history,
    historyRows: rows,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "promote");
  assert.equal(candidate.proposedTarget?.weightMin, 35);
  assert.equal(candidate.sourceSession?.performedAt, "2026-04-16T10:00:00.000Z");
});

test("progression review does not promote Lateral Raise when above-target load misses top reps", () => {
  const rows = buildHistoryRows({
    sessionId: "lateral-raise-session",
    performedAt: "2026-04-16T10:00:00.000Z",
    reps: [8, 8, 8],
    weight: 30,
  });
  const history = buildProgressionHistorySessions({
    rows,
    targetSetCount: 3,
    topRepTarget: 25,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan({
      setsMin: 3,
      setsMax: 3,
      repsMin: 15,
      repsMax: 25,
      weightMin: 20,
      weightMax: 20,
    }),
    history,
    historyRows: rows,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "none");
  assert.match(candidate.reason, /range is not complete/i);
});

test("progression review rejects above-target load when reps or set count do not qualify", () => {
  const missingReps = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [8, 8, 7],
      weight: 30,
    }),
    targetSetCount: 3,
    topRepTarget: 8,
  });
  const oneRepMax = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-2",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [1],
      weight: 100,
    }),
    targetSetCount: 3,
    topRepTarget: 8,
  });

  for (const history of [missingReps, oneRepMax]) {
    const candidate = deriveProgressionReviewCandidate({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
      plan: buildPlan({
        setsMin: 3,
        setsMax: 3,
        repsMin: 6,
        repsMax: 8,
        weightMin: 25,
        weightMax: 25,
      }),
      history,
      fallbackWeightUnit: "lbs",
    });

    assert.equal(candidate.type, "none");
  }
});

test("progression review rejects below-target load even when reps are complete", () => {
  const history = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [8, 8, 8],
      weight: 20,
    }),
    targetSetCount: 3,
    topRepTarget: 8,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan({
      setsMin: 3,
      setsMax: 3,
      repsMin: 6,
      repsMax: 8,
      weightMin: 25,
      weightMax: 25,
    }),
    history,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "none");
  assert.match(candidate.reason, /target-load/i);
});

test("progression review caps large above-target load promotions", () => {
  const rows = buildHistoryRows({
    sessionId: "session-1",
    performedAt: "2026-05-04T10:00:00.000Z",
    reps: [8, 8, 8],
    weight: 80,
  });
  const history = buildProgressionHistorySessions({
    rows,
    targetSetCount: 3,
    topRepTarget: 8,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan({
      setsMin: 3,
      setsMax: 3,
      repsMin: 6,
      repsMax: 8,
      weightMin: 25,
      weightMax: 25,
    }),
    history,
    historyRows: rows,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "promote");
  assert.equal(candidate.proposedTarget?.weightMin, 35);
  assert.match(candidate.reason, /capped for review/i);
});

test("progression review promotes from older best qualifying session when latest is incomplete", () => {
  const rows = [
    ...buildHistoryRows({
      sessionId: "older-session",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [8, 8, 8],
      weight: 30,
    }),
    ...buildHistoryRows({
      sessionId: "latest-session",
      performedAt: "2026-05-06T10:00:00.000Z",
      reps: [8, 8, 7],
      weight: 30,
    }),
  ];
  const history = buildProgressionHistorySessions({
    rows,
    targetSetCount: 3,
    topRepTarget: 8,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan({
      setsMin: 3,
      setsMax: 3,
      repsMin: 6,
      repsMax: 8,
      weightMin: 25,
      weightMax: 25,
    }),
    history,
    historyRows: rows,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "promote");
  assert.equal(candidate.proposedTarget?.weightMin, 35);
  assert.equal(candidate.sourceSession?.sessionId, "older-session");
  assert.equal(candidate.sourceSession?.isLatest, false);
});

test("progression review does not pool qualified load sets across sessions", () => {
  const rows = [
    ...buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [8],
      weight: 80,
    }),
    ...buildHistoryRows({
      sessionId: "session-2",
      performedAt: "2026-05-05T10:00:00.000Z",
      reps: [8],
      weight: 80,
    }),
    ...buildHistoryRows({
      sessionId: "session-3",
      performedAt: "2026-05-06T10:00:00.000Z",
      reps: [8],
      weight: 80,
    }),
  ];
  const history = buildProgressionHistorySessions({
    rows,
    targetSetCount: 3,
    topRepTarget: 8,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan({
      setsMin: 3,
      setsMax: 3,
      repsMin: 6,
      repsMax: 8,
      weightMin: 25,
      weightMax: 25,
    }),
    history,
    historyRows: rows,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "none");
});

test("progression review promotes time targets by duration step", () => {
  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: {
      measurementType: "time",
      durationSeconds: 1200,
    },
    history: [],
    historyRows: buildCardioHistoryRows({ durationSeconds: 1200 }),
    fallbackWeightUnit: "lbs",
    progressionStepPolicy: {
      kind: "duration",
      equipmentFamily: "cardio",
      label: "Duration step",
      defaultValue: 60,
      unit: "seconds",
      description: "Time-based progression defaults to adding 60 seconds.",
      source: "equipment_default",
    },
  });

  assert.equal(candidate.type, "promote");
  assert.equal(candidate.currentTarget?.durationSeconds, 1200);
  assert.equal(candidate.proposedTarget?.durationSeconds, 1260);
  assert.match(candidate.reason, /increase duration/i);
});

test("progression review promotes distance targets by distance step", () => {
  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: {
      measurementType: "distance",
      distance: 2,
      distanceUnit: "mi",
    },
    history: [],
    historyRows: buildCardioHistoryRows({ distance: 2, distanceUnit: "mi" }),
    fallbackWeightUnit: "lbs",
    progressionStepPolicy: {
      kind: "distance",
      equipmentFamily: "cardio",
      label: "Distance step",
      defaultValue: 0.1,
      unit: "mi",
      description: "Distance progression defaults to adding 0.1 mi.",
      source: "equipment_default",
    },
  });

  assert.equal(candidate.type, "promote");
  assert.equal(candidate.currentTarget?.distance, 2);
  assert.equal(candidate.proposedTarget?.distance, 2.1);
  assert.match(candidate.reason, /increase distance/i);
});

test("progression review promotes time distance targets by holding time and increasing distance", () => {
  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: {
      measurementType: "time_distance",
      durationSeconds: 1200,
      distance: 2,
      distanceUnit: "mi",
    },
    history: [],
    historyRows: buildCardioHistoryRows({ durationSeconds: 1200, distance: 2, distanceUnit: "mi" }),
    fallbackWeightUnit: "lbs",
    progressionStepPolicy: {
      kind: "distance",
      equipmentFamily: "cardio",
      label: "Distance step",
      defaultValue: 0.1,
      unit: "mi",
      description: "Distance progression defaults to adding 0.1 mi.",
      source: "equipment_default",
    },
  });

  assert.equal(candidate.type, "promote");
  assert.equal(candidate.proposedTarget?.durationSeconds, 1200);
  assert.equal(candidate.proposedTarget?.distance, 2.1);
  assert.match(candidate.reason, /hold time and increase distance/i);
});

test("progression review creates Manual Review cardio review candidate without auto-promotion", () => {
  const candidate = deriveProgressionReviewCandidate({
    playbookId: "fixed_load_rep_range_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: {
      measurementType: "time",
      durationSeconds: 1200,
    },
    history: [],
    historyRows: buildCardioHistoryRows({ durationSeconds: 1200 }),
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "review");
  assert.equal(candidate.currentTarget?.durationSeconds, 1200);
  assert.equal(candidate.proposedTarget?.durationSeconds, 1200);
  assert.match(candidate.reason, /review before increasing/i);
});

test("progression review does not promote cardio targets without completed logged measurements", () => {
  for (const plan of [
    { measurementType: "time" as const, durationSeconds: 1200 },
    { measurementType: "distance" as const, distance: 2, distanceUnit: "mi" as const },
    { measurementType: "time_distance" as const, durationSeconds: 1200, distance: 2, distanceUnit: "mi" as const },
  ]) {
    const candidate = deriveProgressionReviewCandidate({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
      plan,
      history: [],
      historyRows: [],
      fallbackWeightUnit: "lbs",
    });

    assert.equal(candidate.type, "none");
    assert.match(candidate.reason, /no completed target history/i);
  }
});

test("manual cardio and stretch targets do not create candidates", () => {
  const manualCardio = deriveProgressionReviewCandidate({
    playbookId: null,
    config: null,
    plan: {
      measurementType: "time",
      durationSeconds: 1200,
    },
    history: [],
    fallbackWeightUnit: "lbs",
  });
  const stretch = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: {
      measurementType: "none",
    },
    history: [],
    fallbackWeightUnit: "lbs",
  });

  assert.equal(manualCardio.type, "none");
  assert.equal(stretch.type, "none");
});

test("progression review can use resolved progression step policy for promotion math", () => {
  const rows = buildHistoryRows({
    sessionId: "session-1",
    performedAt: "2026-05-04T10:00:00.000Z",
    reps: [10, 10, 10],
    weight: 100,
  });
  const history = buildProgressionHistorySessions({
    rows,
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan(),
    history,
    historyRows: rows,
    fallbackWeightUnit: "lbs",
    progressionStepPolicy: {
      kind: "load",
      equipmentFamily: "barbell",
      label: "Load step",
      defaultValue: 10,
      unit: "lbs",
      description: "Barbell progression defaults to 10 lb.",
      source: "equipment_default",
    },
  });

  assert.equal(candidate.type, "promote");
  assert.equal(candidate.proposedTarget?.weightMin, 110);
});

test("progression review creates review candidate for Manual Review without bumping load", () => {
  const history = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [10, 10, 10],
      weight: 100,
    }),
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "fixed_load_rep_range_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan(),
    history,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "review");
  assert.equal(candidate.currentTarget?.weightMin, 100);
  assert.equal(candidate.proposedTarget?.weightMin, 100);
  assert.match(candidate.reason, /review before increasing/i);
});

test("progression review treats manual targets as no candidate", () => {
  const candidate = deriveProgressionReviewCandidate({
    playbookId: null,
    config: null,
    plan: buildPlan(),
    history: [],
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "none");
  assert.equal(candidate.playbookId, null);
  assert.match(candidate.reason, /Manual target/i);
});

test("progression review does not create candidate for incomplete range", () => {
  const history = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [9, 8, 8],
      weight: 100,
    }),
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan(),
    history,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "none");
  assert.match(candidate.reason, /not complete/i);
});

test("progression review does not count skipped or absent exposures as stalls", () => {
  const history = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [8, 8, 8],
      weight: 100,
    }),
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5, stallPolicy: "deload_after_stall", stallThreshold: 2, deloadPercent: 10 },
    plan: buildPlan(),
    history,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "none");
  assert.doesNotMatch(candidate.reason, /stall detected/i);
});

test("progression review maps legacy fixed-load aliases to Manual Review candidate", () => {
  const history = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [10, 10, 10],
      weight: 100,
    }),
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const candidate = deriveProgressionReviewCandidate({
    playbookId: "hold_and_review",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan(),
    history,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(candidate.type, "review");
  assert.equal(candidate.playbookId, "fixed_load_rep_range_progression");
  assert.equal(candidate.label, "Manual Review");
});

test("deload after stall reduces load after the configured stall threshold", () => {
  const history = buildProgressionHistorySessions({
    rows: [
      ...buildHistoryRows({
        sessionId: "session-2",
        performedAt: "2026-05-04T10:00:00.000Z",
        reps: [8, 8, 8],
        weight: 100,
      }),
      ...buildHistoryRows({
        sessionId: "session-1",
        performedAt: "2026-05-01T10:00:00.000Z",
        reps: [7, 7, 7],
        weight: 100,
      }),
    ],
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const target = deriveProgressionPlaybookTarget({
    playbookId: "deload_after_stall",
    config: { version: 1, loadIncrement: 5, stallThreshold: 2, deloadPercent: 10 },
    plan: buildPlan(),
    history,
    fallbackWeightUnit: "lbs",
  });

  assert.ok(target);
  assert.equal(target.playbookId, "deload_after_stall");
  assert.equal(target.changed, true);
  assert.equal(target.plan.weightMin, 90);
  assert.equal(target.plan.repsMin, 8);
  assert.equal(target.plan.repsMax, 8);
});

test("deload modifier combines with double progression without using deload as method id", () => {
  const history = buildProgressionHistorySessions({
    rows: [
      ...buildHistoryRows({
        sessionId: "session-2",
        performedAt: "2026-05-04T10:00:00.000Z",
        reps: [8, 8, 8],
        weight: 100,
      }),
      ...buildHistoryRows({
        sessionId: "session-1",
        performedAt: "2026-05-01T10:00:00.000Z",
        reps: [7, 7, 7],
        weight: 100,
      }),
    ],
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const target = deriveProgressionPlaybookTarget({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5, stallPolicy: "deload_after_stall", stallThreshold: 2, deloadPercent: 10 },
    plan: buildPlan(),
    history,
    fallbackWeightUnit: "lbs",
  });

  assert.ok(target);
  assert.equal(target.playbookId, "double_progression");
  assert.equal(target.changed, true);
  assert.equal(target.plan.weightMin, 90);
  assert.match(target.reason, /Deload policy/i);
});

test("deload modifier combines with fixed-load block", () => {
  const history = buildProgressionHistorySessions({
    rows: [
      ...buildHistoryRows({
        sessionId: "session-2",
        performedAt: "2026-05-04T10:00:00.000Z",
        reps: [8, 8, 8],
        weight: 100,
      }),
      ...buildHistoryRows({
        sessionId: "session-1",
        performedAt: "2026-05-01T10:00:00.000Z",
        reps: [7, 7, 7],
        weight: 100,
      }),
    ],
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const target = deriveProgressionPlaybookTarget({
    playbookId: "fixed_load_rep_range_progression",
    config: { version: 1, loadIncrement: 5, stallPolicy: "deload_after_stall", stallThreshold: 2, deloadPercent: 10 },
    plan: buildPlan(),
    history,
    fallbackWeightUnit: "lbs",
  });

  assert.ok(target);
  assert.equal(target.playbookId, "fixed_load_rep_range_progression");
  assert.equal(target.changed, true);
  assert.equal(target.plan.weightMin, 90);
  assert.match(target.reason, /Deload policy/i);
});

test("no history falls back by returning no playbook derivation", () => {
  const target = deriveProgressionPlaybookTarget({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan(),
    history: [],
    fallbackWeightUnit: "lbs",
  });

  assert.equal(target, null);
});

test("invalid stored config is rejected", () => {
  const selection = validateProgressionPlaybookSelection({
    playbookId: "deload_after_stall",
    config: { version: 1, loadIncrement: 5, stallThreshold: 0, deloadPercent: 10 },
  });

  assert.equal(selection, null);
});

test("unit preservation keeps kg targets intact", () => {
  const history = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [10, 10, 10],
      weight: 60,
      weightUnit: "kg",
    }),
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const target = deriveProgressionPlaybookTarget({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 2.5 },
    plan: buildPlan({
      weightMin: 60,
      weightMax: 60,
      weightUnit: "kg",
    }),
    history,
    fallbackWeightUnit: "kg",
  });

  assert.ok(target);
  assert.equal(target.plan.weightMin, 62.5);
  assert.equal(target.plan.weightUnit, "kg");
});

test("bodyweight and cardio targets fall back without progression derivation", () => {
  const weightedHistory = buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps: [10, 10, 10],
      weight: 100,
    }),
    targetSetCount: 3,
    topRepTarget: 10,
  });

  const bodyweightTarget = deriveProgressionPlaybookTarget({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: buildPlan({
      weightMin: null,
      weightMax: null,
    }),
    history: weightedHistory,
    fallbackWeightUnit: "lbs",
  });

  const cardioTarget = deriveProgressionPlaybookTarget({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    plan: {
      measurementType: "time",
      durationSeconds: 900,
    },
    history: weightedHistory,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(bodyweightTarget, null);
  assert.equal(cardioTarget, null);
});

test("set flow layer defaults to straight sets and exposes stable initial options", () => {
  const model = getDefaultProgressionLayerModel();
  const setFlows = listSetFlowDefinitions();

  assert.equal(model.setFlow, "straight_sets");
  assert.deepEqual(setFlows.map((flow) => flow.id), [
    "straight_sets",
    "ascending_ramp",
    "descending_backoff",
  ]);
});

test("visible progression method options exclude legacy manual-review aliases", () => {
  assert.deepEqual(listProgressionMethodDefinitions().map((method) => method.id), [
    "manual",
    "double_progression",
  ]);
});

test("training goal seeds defaults without turning failure into progression method", () => {
  const muscle = getDefaultProgressionLayerModel({ trainingGoal: "build_muscle" });
  const strength = getDefaultProgressionLayerModel({ trainingGoal: "build_strength" });

  assert.equal(muscle.progressionMethod, "double_progression");
  assert.equal(muscle.intensityTarget, "last_set_failure");
  assert.notEqual(muscle.progressionMethod, "last_set_failure");
  assert.equal(strength.setFlow, "straight_sets");
  assert.equal(strength.regressionPolicy, "deload_after_stall");
});

test("legacy fixed-load method names normalize to legacy manual-review layer", () => {
  assert.equal(normalizeProgressionMethodLayerId("fixed_load_block"), "hold_and_review");
  assert.equal(normalizeProgressionMethodLayerId("fixed_load_rep_range_progression"), "hold_and_review");
  assert.equal(normalizeProgressionMethodLayerId("deload_after_stall"), "double_progression");
});

test("progression step labels are measurement-aware", () => {
  assert.equal(getProgressionStepLabel("reps"), "Progression step");
  assert.equal(getProgressionStepLabel("time"), "Duration step");
  assert.equal(getProgressionStepLabel("distance"), "Distance step");
  assert.equal(getProgressionStepLabel("time_distance"), "Pace / volume step");
  assert.equal(getProgressionStepLabel("none"), null);
});

test("cycle day math uses calendar start date and cycle length", () => {
  assert.equal(getCycleDayIndex({
    startDate: "2026-05-11",
    targetDate: "2026-05-11",
    cycleLengthDays: 3,
  }), 1);
  assert.equal(getCycleDayIndex({
    startDate: "2026-05-11",
    targetDate: "2026-05-14",
    cycleLengthDays: 3,
  }), 1);
  assert.equal(getCycleDayIndex({
    startDate: "2026-05-11",
    targetDate: "2026-05-16",
    cycleLengthDays: 3,
  }), 3);
});

test("every progression info term has meaning affects and example copy", () => {
  for (const term of PROGRESSION_INFO_TERM_DEFINITIONS) {
    assert.ok(term.term);
    assert.ok(term.meaning);
    assert.ok(term.affects);
    assert.ok(term.example);
  }
});
