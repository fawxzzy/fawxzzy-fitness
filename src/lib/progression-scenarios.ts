import { getLiveSetInputOrder, type LiveSetMetricFlags } from "@/lib/live-set-input-order";
import {
  buildProgressionHistorySessions,
  deriveProgressionReviewCandidate,
  TRAINING_GOAL_DEFINITIONS,
  type ProgressionHistorySetRow,
  type ProgressionReviewCandidate,
  type ProgressionTargetPlan,
  type TrainingGoalId,
} from "@/lib/progression-playbooks";
import { formatProgressionReviewDisplayItem, type ProgressionReviewDisplayItem } from "@/lib/progression-review-display";
import { getRoutineCycleOccurrence } from "@/lib/routines";
import { getDefaultSetFlowForTrainingGoal, listSupportedSetFlowDefinitions } from "@/lib/set-flow";
import {
  createProgressionPlaybookFormStateForTrainingGoal,
  isTrainingGoalCustomized,
} from "@/lib/progression-playbook-form-state";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import { describePlannedSetTarget, generateSetFlowTargets } from "@/lib/set-flow-targets";

export type ProgressionScenarioCategory =
  | "candidate"
  | "cycle"
  | "training-goal"
  | "set-flow"
  | "logger";

export type ProgressionScenario = {
  id: string;
  title: string;
  category: ProgressionScenarioCategory;
  simulatedState: string[];
  inspectRoute: string;
  expectedUi: string[];
  reset: string;
  candidate: ProgressionReviewCandidate | null;
  candidateDisplay: ProgressionReviewDisplayItem | null;
  engineSummary: string[];
};

export type WritableProgressionScenarioSummary = {
  id: string;
  title: string;
  expected: string;
};

export const WRITABLE_PROGRESSION_SCENARIO_SUMMARIES: WritableProgressionScenarioSummary[] = [
  {
    id: "strength_promote_exact_target",
    title: "Strength promote at exact target",
    expected: "Ready Update after all checked sets hit top reps at target load.",
  },
  {
    id: "strength_promote_above_target",
    title: "Strength promote above target",
    expected: "Ready Update from highest fully qualified load plus step, capped.",
  },
  {
    id: "strength_partial_not_ready",
    title: "Strength partial not ready",
    expected: "Progress Status only; no Promote button.",
  },
  {
    id: "huge_weight_low_rep_not_ready",
    title: "Huge weight low rep not ready",
    expected: "Progress Status only; one heavy low-rep set cannot promote.",
  },
  {
    id: "below_target_load_not_ready",
    title: "Below target load not ready",
    expected: "Progress Status shows below-target load.",
  },
  {
    id: "hold_review_ready",
    title: "Manual Review ready",
    expected: "Review candidate without auto-bump language.",
  },
  {
    id: "cardio_time_promote",
    title: "Cardio time promote",
    expected: "Ready Update with duration step language.",
  },
  {
    id: "cardio_distance_promote",
    title: "Cardio distance promote",
    expected: "Ready Update with distance step language.",
  },
  {
    id: "same_exercise_same_target_linked",
    title: "Same exercise same target linked",
    expected: "Identical same-target rows collapse into one linked update; Apply/Revert affects the verified linked target group.",
  },
  {
    id: "linked_same_target_all_ready",
    title: "Linked same target all ready",
    expected: "One linked Ready Update with three eligible selected targets by default.",
  },
  {
    id: "linked_same_target_partial_selection",
    title: "Linked same target partial selection",
    expected: "Linked Ready Update defaults all checked and supports selected-row apply.",
  },
  {
    id: "linked_target_drift_reject",
    title: "Linked target drift reject",
    expected: "Server rejects linked Apply if a selected target/config fingerprint drifts.",
  },
  {
    id: "linked_apply_revert_group",
    title: "Linked apply revert group",
    expected: "Selected linked rows apply together and Revert restores their snapshots.",
  },
  {
    id: "linked_pinned_revalidation",
    title: "Linked pinned revalidation",
    expected: "Linked Apply pin keeps Revert visible after server revalidation.",
  },
  {
    id: "linked_status_only",
    title: "Linked status only",
    expected: "Same target elsewhere is linked context only when no update is earned.",
  },
  {
    id: "same_exercise_different_target_separate",
    title: "Same exercise different target separate",
    expected: "Different target fingerprints stay separate.",
  },
  {
    id: "deload_after_stall",
    title: "Deload after stall",
    expected: "Regression candidate after repeated misses.",
  },
  {
    id: "no_history",
    title: "No history",
    expected: "Progress Status only; no completed work found.",
  },
  {
    id: "stretch_hidden",
    title: "Stretch hidden",
    expected: "Stretch hidden from normal Progression Updates.",
  },
  {
    id: "full_strength_cycle_mixed",
    title: "Full strength cycle mixed",
    expected: "Full routine suite with ready, partial, below-load, above-target, no-history, cardio, and hidden stretch rows.",
  },
  {
    id: "full_cardio_cycle_mixed",
    title: "Full cardio cycle mixed",
    expected: "Full cardio routine with duration, distance, status-only, and no-history rows.",
  },
  {
    id: "full_linked_targets_cycle",
    title: "Full linked targets cycle",
    expected: "Full routine with three matching same-exercise targets collapsed into one selectable linked update.",
  },
  {
    id: "full_duplicate_exercise_different_targets",
    title: "Full duplicate exercise different targets",
    expected: "Same exercise with different targets stays separate and does not link.",
  },
  {
    id: "full_deload_cycle",
    title: "Full deload cycle",
    expected: "Repeated logged misses create a regression candidate while absent sessions do not count.",
  },
  {
    id: "full_training_focus_defaults",
    title: "Full training focus defaults",
    expected: "Representative focus-style defaults for strength, muscle, maintain, conditioning, and technique review.",
  },
  {
    id: "full_history_context_cycle",
    title: "Full history context cycle",
    expected: "Old routine history appears as context only and does not create Promote on a new planned row.",
  },
  {
    id: "full_stats_analytics_cycle",
    title: "Full stats analytics cycle",
    expected: "Several weeks of realistic sessions provide stable stats and cycle-summary expectations.",
  },
];

const CYCLE_WINDOW = { startDate: "2026-05-04", endDate: "2026-05-10" };
const READ_ONLY_RESET = "No reset required. This scenario is simulated and does not create DB rows.";

const baseStrengthPlan: ProgressionTargetPlan = {
  measurementType: "reps",
  setsMin: 3,
  setsMax: 3,
  repsMin: 8,
  repsMax: 10,
  weightMin: 100,
  weightMax: 100,
  weightUnit: "lbs",
};

function buildHistoryRows(args: {
  sessionId: string;
  performedAt: string;
  reps: number[];
  weight?: number;
  weightUnit?: "lbs" | "kg";
}): ProgressionHistorySetRow[] {
  return args.reps.map((reps, index) => ({
    sessionId: args.sessionId,
    performedAt: args.performedAt,
    setIndex: index + 1,
    reps,
    weight: args.weight ?? 100,
    weightUnit: args.weightUnit ?? "lbs",
    isWarmup: false,
  }));
}

function buildStrengthHistory(reps: number[]) {
  return buildProgressionHistorySessions({
    rows: buildHistoryRows({
      sessionId: "qa-session-1",
      performedAt: "2026-05-04T10:00:00.000Z",
      reps,
      weight: 100,
    }),
    targetSetCount: 3,
    topRepTarget: 10,
  });
}

function buildDeloadHistory() {
  return buildProgressionHistorySessions({
    rows: [
      ...buildHistoryRows({
        sessionId: "qa-session-2",
        performedAt: "2026-05-04T10:00:00.000Z",
        reps: [8, 8, 8],
        weight: 100,
      }),
      ...buildHistoryRows({
        sessionId: "qa-session-1",
        performedAt: "2026-05-01T10:00:00.000Z",
        reps: [7, 7, 7],
        weight: 100,
      }),
    ],
    targetSetCount: 3,
    topRepTarget: 10,
  });
}

function durationStepPolicy(): ProgressionStepPolicy {
  return {
    kind: "duration",
    equipmentFamily: "cardio",
    label: "Duration step",
    defaultValue: 60,
    unit: "seconds",
    description: "Time-based progression defaults to adding 60 seconds.",
    source: "equipment_default",
  };
}

function distanceStepPolicy(): ProgressionStepPolicy {
  return {
    kind: "distance",
    equipmentFamily: "cardio",
    label: "Distance step",
    defaultValue: 0.1,
    unit: "mi",
    description: "Distance progression defaults to adding 0.1 mi.",
    source: "equipment_default",
  };
}

function buildCandidateScenario(args: {
  id: string;
  title: string;
  exerciseName: string;
  simulatedState: string[];
  expectedUi: string[];
  playbookId: unknown;
  config: unknown;
  plan: ProgressionTargetPlan;
  history: ReturnType<typeof buildProgressionHistorySessions>;
  progressionStepPolicy?: ProgressionStepPolicy | null;
}) {
  const candidate = deriveProgressionReviewCandidate({
    playbookId: args.playbookId,
    config: args.config,
    plan: args.plan,
    history: args.history,
    fallbackWeightUnit: "lbs",
    progressionStepPolicy: args.progressionStepPolicy,
    cycleWindow: CYCLE_WINDOW,
    allowSimulatedCandidateWithoutHistory: true,
  });

  return buildScenario({
    id: args.id,
    title: args.title,
    category: "candidate",
    simulatedState: args.simulatedState,
    inspectRoute: "/today",
    expectedUi: args.expectedUi,
    candidate,
    candidateDisplay: formatProgressionReviewDisplayItem({
      id: `qa-${args.id}`,
      exerciseName: args.exerciseName,
      candidate,
    }),
    engineSummary: [
      `candidate.type = ${candidate.type}`,
      `candidate.reason = ${candidate.reason}`,
    ],
  });
}

function buildScenario(args: Omit<ProgressionScenario, "reset"> & { reset?: string }): ProgressionScenario {
  return {
    reset: READ_ONLY_RESET,
    ...args,
  };
}

function addUtcDays(date: string, offset: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
}

function buildCycleOccurrenceScenario() {
  const startDate = "2026-05-11";
  const cycleLengthDays = 3;
  const occurrences = Array.from({ length: 14 }, (_, index) => {
    const referenceDate = addUtcDays(startDate, index);
    const dayIndex = (index % cycleLengthDays) + 1;
    const occurrence = getRoutineCycleOccurrence({
      startDate,
      cycleLengthDays,
      profileTimeZone: "America/New_York",
      dayIndex,
      referenceDate,
    });

    return `${occurrence.occurrenceDate}: Day ${occurrence.dayIndex} (${occurrence.occurrenceWeekdayShort}) rotation ${occurrence.cycleRotationIndex}`;
  });

  return buildScenario({
    id: "cycle-occurrence-3-day",
    title: "3-day cycle occurrence labels",
    category: "cycle",
    simulatedState: [
      "Cycle Start = 2026-05-11",
      "Cycle Length = 3 days",
      "Weekday/date labels are derived from each occurrence, not stored on routine days.",
    ],
    inspectRoute: "/today?switch=1",
    expectedUi: [
      "Day names stay stable.",
      "Weekday labels move Mon -> Tue -> Wed -> Thu as the cycle rotates.",
      "Switch-day cards show weekday only, not calendar date.",
    ],
    candidate: null,
    candidateDisplay: null,
    engineSummary: occurrences,
  });
}

function buildTrainingGoalCustomizedScenario() {
  const seeded = createProgressionPlaybookFormStateForTrainingGoal("build_strength");
  const customized = {
    ...seeded,
    progressionSetFlow: "ascending_ramp" as const,
  };

  return buildScenario({
    id: "training-goal-customized",
    title: "Training Focus customized state",
    category: "training-goal",
    simulatedState: [
      "Training Focus = Build Strength",
      "Goal seed setFlow = Straight Sets",
      "User manually changed setFlow = Ascending Sets",
    ],
    inspectRoute: "/routines/new",
    expectedUi: [
      "Training Focus remains Build Strength.",
      "UI shows Customized instead of blanking the goal.",
      "Progression selection does not back-infer Training Focus.",
    ],
    candidate: null,
    candidateDisplay: null,
    engineSummary: [
      `seeded.progressionSetFlow = ${seeded.progressionSetFlow}`,
      `customized.progressionSetFlow = ${customized.progressionSetFlow}`,
      `isTrainingGoalCustomized = ${isTrainingGoalCustomized("build_strength", customized)}`,
    ],
  });
}

function buildSetFlowDefaultsScenario() {
  const goals = Object.keys(TRAINING_GOAL_DEFINITIONS) as TrainingGoalId[];
  const defaults = goals.map((goal) => {
    const definition = TRAINING_GOAL_DEFINITIONS[goal];
    return `${definition.label}: ${getDefaultSetFlowForTrainingGoal(goal)}`;
  });
  const flows = listSupportedSetFlowDefinitions().map((definition) => (
    `${definition.label}: ${definition.shortExplanation}`
  ));

  return buildScenario({
    id: "set-flow-defaults-by-goal",
    title: "Sets Flow defaults by Training Focus",
    category: "set-flow",
    simulatedState: [
      "Sets Flow is model/default only in this pass.",
      "No current-session logger behavior changes yet.",
    ],
    inspectRoute: "/routines/new",
    expectedUi: [
      "New/Edit Routine can show Sets Flow model/defaults.",
      "Add Exercise, Edit Day cards, and Current Session do not show the long Sets Flow education block.",
    ],
    candidate: null,
    candidateDisplay: null,
    engineSummary: [...defaults, ...flows],
  });
}

function buildSetFlowTargetScenario() {
  const flowIds = ["straight_sets", "ascending_ramp", "descending_backoff"] as const;
  const plan: ProgressionTargetPlan = {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsMin: 8,
    repsMax: 10,
    weightMin: 135,
    weightMax: 135,
    weightUnit: "lbs",
  };
  const stepPolicy: ProgressionStepPolicy = {
    kind: "load",
    equipmentFamily: "barbell",
    label: "Load step",
    defaultValue: 10,
    unit: "lbs",
    description: "Barbell progression defaults to 10 lb.",
    source: "equipment_default",
  };

  return buildScenario({
    id: "set-flow-planned-targets",
    title: "Sets Flow planned targets",
    category: "set-flow",
    simulatedState: [
      "Target = 3 sets, 8-10 reps, 135 lbs",
      "Progression step = 10 lb barbell step",
      "Generated targets are advisory display hints only.",
    ],
    inspectRoute: "/session/[active-session-id]",
    expectedUi: [
      "Logger can show small planned-set labels when a safe slot exists.",
      "Actual logged sets remain user truth.",
      "Sets Flow must not mutate saved sets.",
    ],
    candidate: null,
    candidateDisplay: null,
    engineSummary: flowIds.flatMap((setFlow) => [
      `${setFlow}:`,
      ...generateSetFlowTargets({ setFlow, plan, progressionStepPolicy: stepPolicy }).map((target) => (
        `  ${describePlannedSetTarget(target)}`
      )),
    ]),
  });
}

function formatOrder(requiredMetrics: LiveSetMetricFlags, isCardio: boolean) {
  const result = getLiveSetInputOrder({
    requiredMetrics,
    configuredMetrics: requiredMetrics,
    draftValues: {},
    isCardio,
  });

  return `order=${result.metricOrder.join(", ")}; dimmed=${result.dimmedMetrics.join(", ") || "none"}`;
}

function buildLoggerInputScenario() {
  const off: LiveSetMetricFlags = { reps: false, weight: false, time: false, distance: false, calories: false };
  const strength: LiveSetMetricFlags = { ...off, reps: true, weight: true };
  const time: LiveSetMetricFlags = { ...off, time: true };
  const distance: LiveSetMetricFlags = { ...off, distance: true };
  const timeDistance: LiveSetMetricFlags = { ...off, time: true, distance: true };

  return buildScenario({
    id: "required-first-logger-inputs",
    title: "Required-first logger inputs",
    category: "logger",
    simulatedState: [
      "Strength requires reps + weight.",
      "Time requires duration.",
      "Distance requires distance.",
      "Optional fields stay visible but dimmed until used.",
    ],
    inspectRoute: "/session/[active-session-id]",
    expectedUi: [
      "Required metrics render before optional metrics.",
      "Failure keeps reps visible as performance data.",
      "Warm Up remains at the far edge of the row.",
    ],
    candidate: null,
    candidateDisplay: null,
    engineSummary: [
      `strength: ${formatOrder(strength, false)}`,
      `time: ${formatOrder(time, true)}`,
      `distance: ${formatOrder(distance, true)}`,
      `time_distance: ${formatOrder(timeDistance, true)}`,
      `stretch/optional: ${formatOrder(off, false)}`,
    ],
  });
}

export function buildProgressionScenarioFixtures(): ProgressionScenario[] {
  return [
    buildCandidateScenario({
      id: "no-candidate",
      title: "No candidate",
      exerciseName: "Manual Row",
      simulatedState: [
        "Manual target",
        "No progression playbook selected",
      ],
      expectedUi: [
        "Today shows no Progression Updates card.",
        "No empty card or layout gap is left behind.",
      ],
      playbookId: null,
      config: null,
      plan: baseStrengthPlan,
      history: [],
    }),
    buildCandidateScenario({
      id: "double-progression-promote",
      title: "Double Progression promote",
      exerciseName: "QA Bench Press",
      simulatedState: [
        "Target = 3 sets, 8-10 reps, 100 lbs",
        "Completed = 10, 10, 10 at 100 lbs",
      ],
      expectedUi: [
        "Today card says Promote.",
        "Copy shows 100 lbs -> 105 lbs.",
        "Apply should update only this one exercise target.",
      ],
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
      plan: baseStrengthPlan,
      history: buildStrengthHistory([10, 10, 10]),
    }),
    buildCandidateScenario({
      id: "hold-review",
      title: "Manual Review candidate",
      exerciseName: "QA Lateral Raise",
      simulatedState: [
        "Method = Manual Review",
        "Target range complete at the same load",
      ],
      expectedUi: [
        "Today card says Review.",
        "No automatic target bump language.",
        "Action should be Review manually unless a future explicit target exists.",
      ],
      playbookId: "fixed_load_rep_range_progression",
      config: { version: 1, loadIncrement: 5 },
      plan: baseStrengthPlan,
      history: buildStrengthHistory([10, 10, 10]),
    }),
    buildCandidateScenario({
      id: "deload-after-stall",
      title: "Deload after stall",
      exerciseName: "QA Squat",
      simulatedState: [
        "Method = Double Progression",
        "Regression = Deload",
        "Two logged misses at the current load",
      ],
      expectedUi: [
        "Today card says Regression.",
        "Copy says stall detected, not skipped.",
        "Apply should reduce only this one exercise target.",
      ],
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5, stallPolicy: "deload_after_stall", stallThreshold: 2, deloadPercent: 10 },
      plan: baseStrengthPlan,
      history: buildDeloadHistory(),
    }),
    buildCandidateScenario({
      id: "time-cardio-promote",
      title: "Time cardio promote",
      exerciseName: "QA Treadmill Time",
      simulatedState: [
        "Measurement = time",
        "Duration step = 60 seconds",
      ],
      expectedUi: [
        "Today card says Promote.",
        "Copy shows 20:00 -> 21:00.",
        "No load language appears.",
      ],
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
      plan: { measurementType: "time", durationSeconds: 1200 },
      history: [],
      progressionStepPolicy: durationStepPolicy(),
    }),
    buildCandidateScenario({
      id: "distance-cardio-promote",
      title: "Distance cardio promote",
      exerciseName: "QA Distance Run",
      simulatedState: [
        "Measurement = distance",
        "Distance step = 0.1 mi",
      ],
      expectedUi: [
        "Today card says Promote.",
        "Copy shows 2 mi -> 2.1 mi.",
        "No load language appears.",
      ],
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
      plan: { measurementType: "distance", distance: 2, distanceUnit: "mi" },
      history: [],
      progressionStepPolicy: distanceStepPolicy(),
    }),
    buildCandidateScenario({
      id: "time-distance-cardio-promote",
      title: "Time + distance promote",
      exerciseName: "QA Tempo Run",
      simulatedState: [
        "Measurement = time + distance",
        "Initial mode = hold time and increase distance",
      ],
      expectedUi: [
        "Today card says Promote.",
        "Copy keeps 20:00 and increases 2 mi -> 2.1 mi.",
        "No pace/load language appears.",
      ],
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
      plan: { measurementType: "time_distance", durationSeconds: 1200, distance: 2, distanceUnit: "mi" },
      history: [],
      progressionStepPolicy: distanceStepPolicy(),
    }),
    buildCandidateScenario({
      id: "active-session-hides-review",
      title: "Active session hides review",
      exerciseName: "QA Bench Press",
      simulatedState: [
        "A promote candidate exists.",
        "An active session is present for Today.",
      ],
      expectedUi: [
        "Today does not render Progression Updates while a session is active.",
        "Apply action is blocked during active session.",
      ],
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
      plan: baseStrengthPlan,
      history: buildStrengthHistory([10, 10, 10]),
    }),
    buildCandidateScenario({
      id: "stretch-no-candidate",
      title: "Stretch no candidate",
      exerciseName: "QA Stretch",
      simulatedState: [
        "Measurement = none/stretch",
        "Progression is unsupported for this target.",
      ],
      expectedUi: [
        "Today shows no Progression Updates card for Stretch.",
        "Stretch logging remains measurementless.",
      ],
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
      plan: { measurementType: "none" },
      history: [],
    }),
    buildCycleOccurrenceScenario(),
    buildTrainingGoalCustomizedScenario(),
    buildSetFlowDefaultsScenario(),
    buildSetFlowTargetScenario(),
    buildLoggerInputScenario(),
  ];
}

export function getProgressionScenarioFixture(id: string) {
  return buildProgressionScenarioFixtures().find((scenario) => scenario.id === id) ?? null;
}
