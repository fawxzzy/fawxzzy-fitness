import test from "node:test";
import assert from "node:assert/strict";
import {
  areProgressionPlaybookFormStatesEqual,
  appendProgressionPlaybookFormData,
  buildProgressionPlaybookConfigFromFormState,
  buildProgressionPlaybookFormSnapshot,
  createProgressionPlaybookFormState,
  createProgressionPlaybookFormStateForTrainingGoal,
  isTrainingGoalCustomized,
  type ProgressionPlaybookFormState,
} from "@/lib/progression-playbook-form-state";
import {
  getDefaultProgressionLayerModel,
  listTrainingGoalDefinitions,
} from "@/lib/progression-playbooks";
import {
  cycleSetFlowDirection,
  normalizeSetFlowDirectionForStepValue,
  shouldShowEffortShiftLabel,
} from "@/lib/set-flow-directions";

const defaultStepOverrides = {
  barbellLoadIncrement: 10,
  dumbbellLoadIncrement: 5,
  machineLoadIncrement: 15,
  cableLoadIncrement: 15,
  bodyweightRepIncrement: 5,
  durationSecondsIncrement: 30,
  distanceIncrement: 0.5,
};

const defaultSetFlowSteps = {
  loadStep: 5,
  repStep: 2,
};

test("progression form equality normalizes numeric config values", () => {
  const left = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
  });
  const right = {
    ...left,
    progressionLoadIncrement: "5.0",
  };

  assert.equal(areProgressionPlaybookFormStatesEqual(left, right), true);
});

test("manual form state matches manual routine default", () => {
  const manual = createProgressionPlaybookFormState();

  assert.equal(areProgressionPlaybookFormStatesEqual(manual, createProgressionPlaybookFormState()), true);
  assert.equal(buildProgressionPlaybookConfigFromFormState(manual), null);
});

test("manual override differs from playbook routine default", () => {
  const manual = createProgressionPlaybookFormState();
  const routineDefault = createProgressionPlaybookFormState({
    playbookId: "fixed_load_rep_range_progression",
    config: { version: 1, loadIncrement: 5 },
  });

  assert.equal(areProgressionPlaybookFormStatesEqual(manual, routineDefault), false);
});

test("legacy deload playbook id maps to double progression plus deload policy", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "deload_after_stall",
    config: { version: 1, loadIncrement: 5, stallThreshold: 2, deloadPercent: 10 },
  });

  assert.equal(state.progressionPlaybookId, "double_progression");
  assert.equal(state.progressionStallPolicy, "deload_after_stall");
  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    dayProgressionMode: "unsynced",
    setFlow: "straight_sets",
    stallPolicy: "deload_after_stall",
    stallThreshold: 2,
    deloadPercent: 10,
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    repPromotionThreshold: "top_of_range",
  });
});

test("legacy fixed-load aliases restore as the Manual Review stored playbook", () => {
  const stateFromOldName = createProgressionPlaybookFormState({
    playbookId: "fixed_load_block",
    config: { version: 1, loadIncrement: 5 },
  });
  const stateFromNewName = createProgressionPlaybookFormState({
    playbookId: "hold_and_review",
    config: { version: 1, loadIncrement: 5 },
  });

  assert.equal(stateFromOldName.progressionPlaybookId, "fixed_load_rep_range_progression");
  assert.equal(stateFromNewName.progressionPlaybookId, "fixed_load_rep_range_progression");
  assert.equal(areProgressionPlaybookFormStatesEqual(stateFromOldName, stateFromNewName), true);
});

test("auto-update routine goals defaults off", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
  });

  assert.equal(state.progressionAutoUpdateRoutineGoals, false);
});

test("advanced step options persist in progression config", () => {
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionBarbellLoadIncrement: "10",
    progressionDumbbellLoadIncrement: "5",
    progressionBodyweightRepIncrement: "2",
    progressionDurationIncrementSeconds: "90",
    progressionDistanceIncrement: "0.25",
    progressionSetFlowLoadStep: "5",
    progressionSetFlowRepStep: "2",
    progressionSetFlowDurationStep: "45",
    progressionSetFlowDistanceStep: "0.2",
  };

  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: {
      barbellLoadIncrement: 10,
      dumbbellLoadIncrement: 5,
      machineLoadIncrement: 15,
      cableLoadIncrement: 15,
      bodyweightRepIncrement: 2,
      durationSecondsIncrement: 90,
      distanceIncrement: 0.25,
    },
    setFlowSteps: {
      loadStep: 5,
      repStep: 2,
      durationSecondsStep: 45,
      distanceStep: 0.2,
    },
    dayProgressionMode: "unsynced",
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    repPromotionThreshold: "top_of_range",
  });
});

test("advanced step options restore from saved config", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      stepOverrides: {
        barbellLoadIncrement: 10,
        dumbbellLoadIncrement: 7.5,
        durationSecondsIncrement: 90,
      },
      setFlowSteps: {
        loadStep: 5,
        repStep: 2,
        durationSecondsStep: 45,
        distanceStep: 0.2,
      },
    },
  });

  assert.equal(state.progressionBarbellLoadIncrement, "10");
  assert.equal(state.progressionDumbbellLoadIncrement, "7.5");
  assert.equal(state.progressionDurationIncrementSeconds, "90");
  assert.equal(state.progressionSetFlowLoadStep, "5");
  assert.equal(state.progressionSetFlowRepStep, "2");
  assert.equal(state.progressionSetFlowDurationStep, "45");
  assert.equal(state.progressionSetFlowDistanceStep, "0.2");
  assert.equal(state.progressionSetCount, "3");
});

test("set count restores from saved config", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      setsMin: 4,
      setsMax: 4,
    },
  });

  assert.equal(state.progressionSetCount, "4");
  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    setsMin: 4,
    setsMax: 4,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    dayProgressionMode: "unsynced",
    setFlow: "straight_sets",
    setFlowCountMap: {
      time: 4,
      distance: 4,
      reps: 4,
      weight: 4,
    },
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    repPromotionThreshold: "top_of_range",
  });
});

test("promotion directions restore and round-trip through progression config serialization", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      promotionDirectionMap: {
        time: "straight",
        distance: "down",
        reps: "up",
        weight: "down",
      },
    },
  });

  assert.equal(state.progressionPromotionDirectionMap.time, "straight");
  assert.equal(state.progressionPromotionDirectionMap.distance, "down");
  assert.equal(state.progressionPromotionDirectionMap.weight, "down");
  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    dayProgressionMode: "unsynced",
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionDirectionMap: {
      time: "straight",
      distance: "down",
      reps: "up",
      weight: "down",
    },
    promotionBasis: "weight_and_reps",
    repPromotionThreshold: "top_of_range",
  });
});

test("grouped promotion directions restore and round-trip through progression config serialization", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      promotionGroupedDirectionMap: {
        "time+distance": "down",
        "weight+reps": "up",
      },
    },
  });

  assert.equal(state.progressionPromotionGroupedDirectionMap["time+distance"], "down");
  assert.equal(state.progressionPromotionGroupedDirectionMap["weight+reps"], "up");
  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    dayProgressionMode: "unsynced",
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    promotionGroupedDirectionMap: {
      "time+distance": "down",
      "weight+reps": "up",
    },
    repPromotionThreshold: "top_of_range",
  });
});

test("day settings and effort schedule restore from saved config", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      dayProgressionMode: "synced",
      dayProgressionSteps: {
        loadStep: 7.5,
        repStep: 3,
        durationSecondsStep: 120,
        distanceStep: 0.4,
      },
      effortWaveDirections: ["up", "straight", "down", "straight", "up", "down", "straight"],
    },
  });

  assert.equal(state.progressionDayMode, "synced");
  assert.equal(state.progressionDayLoadStep, "0");
  assert.equal(state.progressionDayRepStep, "0");
  assert.equal(state.progressionDayDurationStep, "0");
  assert.equal(state.progressionDayDistanceStep, "0");
  assert.equal(state.progressionDayLoweredLoadStep, "0");
  assert.equal(state.progressionDayLoweredRepStep, "0");
  assert.equal(state.progressionDayLoweredDurationStep, "0");
  assert.equal(state.progressionDayLoweredDistanceStep, "0");
  assert.deepEqual(state.progressionEffortWaveDirections, ["up", "straight", "down", "straight", "up", "down", "straight"]);
});

test("day and set progression settings round-trip through progression config serialization", () => {
  const effortWaveDirections: ProgressionPlaybookFormState["progressionEffortWaveDirections"] = ["up", "straight", "down", "straight", "up", "straight", "down"];
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionSetFlowLoadStep: "6",
    progressionSetFlowRepStep: "3",
    progressionSetFlowDurationStep: "75",
    progressionSetFlowDistanceStep: "0.3",
    progressionDayMode: "synced" as const,
    progressionDayLoadStep: "7.5",
    progressionDayRepStep: "4",
    progressionDayDurationStep: "90",
    progressionDayDistanceStep: "0.4",
    progressionDayLoweredLoadStep: "7.5",
    progressionDayLoweredRepStep: "4",
    progressionDayLoweredDurationStep: "90",
    progressionDayLoweredDistanceStep: "0.4",
    progressionEffortWaveDirections: effortWaveDirections,
  };

  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: {
      loadStep: 6,
      repStep: 3,
      durationSecondsStep: 75,
      distanceStep: 0.3,
    },
    dayProgressionMode: "synced",
    dayProgressionSteps: {
      loadStep: 7.5,
      repStep: 4,
      durationSecondsStep: 90,
      distanceStep: 0.4,
    },
    dayLoweredProgressionSteps: {
      loadStep: 7.5,
      repStep: 4,
      durationSecondsStep: 90,
      distanceStep: 0.4,
    },
    effortWaveDirections,
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    repPromotionThreshold: "top_of_range",
  });
});

test("progression form snapshot tracks restored day and set persistence fields", () => {
  const changedEffortWaveDirections: ProgressionPlaybookFormState["progressionEffortWaveDirections"] = ["up", "straight", "down", "straight", "straight", "straight", "straight"];
  const base = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
  });
  const withDayChange = {
    ...base,
    progressionDayMode: "synced" as const,
    progressionDayRepStep: "4",
  };
  const withSetChange = {
    ...base,
    progressionSetFlowDurationStep: "75",
  };
  const withEffortWaveChange = {
    ...base,
    progressionEffortWaveDirections: changedEffortWaveDirections,
  };
  const withGroupedDirectionChange = {
    ...base,
    progressionPromotionGroupedDirectionMap: {
      "weight+reps": "down" as const,
    },
  };

  assert.notEqual(buildProgressionPlaybookFormSnapshot(base), buildProgressionPlaybookFormSnapshot(withDayChange));
  assert.notEqual(buildProgressionPlaybookFormSnapshot(base), buildProgressionPlaybookFormSnapshot(withSetChange));
  assert.notEqual(buildProgressionPlaybookFormSnapshot(base), buildProgressionPlaybookFormSnapshot(withEffortWaveChange));
  assert.notEqual(buildProgressionPlaybookFormSnapshot(base), buildProgressionPlaybookFormSnapshot(withGroupedDirectionChange));
});

test("set direction flips between ascending and descending once a step value exists", () => {
  assert.equal(cycleSetFlowDirection({ current: "up", hasStepValue: true }), "down");
  assert.equal(cycleSetFlowDirection({ current: "down", hasStepValue: true }), "up");
  assert.equal(cycleSetFlowDirection({ current: "straight", hasStepValue: true }), "up");
});

test("set direction can cycle through straight only while the step value is empty", () => {
  assert.equal(cycleSetFlowDirection({ current: "straight", hasStepValue: false }), "up");
  assert.equal(cycleSetFlowDirection({ current: "up", hasStepValue: false }), "down");
  assert.equal(cycleSetFlowDirection({ current: "down", hasStepValue: false }), "straight");
});

test("entering a set step value normalizes straight directions to ascending without touching non-straight values", () => {
  assert.equal(normalizeSetFlowDirectionForStepValue({ current: "straight", nextValue: "5" }), "up");
  assert.equal(normalizeSetFlowDirectionForStepValue({ current: "straight", nextValue: "" }), "straight");
  assert.equal(normalizeSetFlowDirectionForStepValue({ current: "down", nextValue: "5" }), "down");
  assert.equal(normalizeSetFlowDirectionForStepValue({ current: "down", nextValue: "" }), "straight");
});

test("straight effort days hide no-op shift labels in the example", () => {
  assert.equal(shouldShowEffortShiftLabel("straight"), false);
  assert.equal(shouldShowEffortShiftLabel("up"), true);
  assert.equal(shouldShowEffortShiftLabel("down"), true);
});

test("form data export writes day mode effort schedule and set progression fields", () => {
  const effortWaveDirections: ProgressionPlaybookFormState["progressionEffortWaveDirections"] = ["up", "straight", "down", "straight", "up", "straight", "down"];
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionSetFlowLoadStep: "6",
    progressionSetFlowRepStep: "3",
    progressionSetFlowDurationStep: "75",
    progressionSetFlowDistanceStep: "0.3",
    progressionDayMode: "synced" as const,
    progressionDayLoadStep: "7.5",
    progressionDayRepStep: "4",
    progressionDayDurationStep: "90",
    progressionDayDistanceStep: "0.4",
    progressionDayLoweredLoadStep: "6.5",
    progressionDayLoweredRepStep: "3",
    progressionDayLoweredDurationStep: "60",
    progressionDayLoweredDistanceStep: "0.3",
    progressionEffortWaveDirections: effortWaveDirections,
    progressionTargetMutation: "increase_load_and_reps" as const,
    progressionHasExplicitTargetMutation: true,
    progressionRequiredQualifiedSessions: "2",
    progressionQualificationWindowMode: "consecutive" as const,
    progressionQualificationWindowResetOnMiss: true,
    progressionHasExplicitQualificationWindow: true,
    progressionPromotionGroupedDirectionMap: {
      "time+distance": "down" as const,
      "weight+reps": "up" as const,
    },
  };
  const formData = new FormData();

  appendProgressionPlaybookFormData(formData, state);

  assert.equal(formData.get("progressionSetFlowLoadStep"), "6");
  assert.equal(formData.get("progressionSetFlowRepStep"), "3");
  assert.equal(formData.get("progressionSetFlowDurationStep"), "75");
  assert.equal(formData.get("progressionSetFlowDistanceStep"), "0.3");
  assert.equal(formData.get("progressionDayMode"), "synced");
  assert.equal(formData.get("progressionDayLoadStep"), "7.5");
  assert.equal(formData.get("progressionDayRepStep"), "4");
  assert.equal(formData.get("progressionDayDurationStep"), "90");
  assert.equal(formData.get("progressionDayDistanceStep"), "0.4");
  assert.equal(formData.get("progressionDayLoweredLoadStep"), "6.5");
  assert.equal(formData.get("progressionDayLoweredRepStep"), "3");
  assert.equal(formData.get("progressionDayLoweredDurationStep"), "60");
  assert.equal(formData.get("progressionDayLoweredDistanceStep"), "0.3");
  assert.equal(
    formData.get("progressionEffortWaveDirectionsJson"),
    JSON.stringify(effortWaveDirections),
  );
  assert.equal(formData.get("progressionTargetMutation"), "increase_load_and_reps");
  assert.equal(formData.get("progressionHasExplicitTargetMutation"), "1");
  assert.equal(formData.get("progressionRequiredQualifiedSessions"), "2");
  assert.equal(formData.get("progressionQualificationWindowMode"), "consecutive");
  assert.equal(formData.get("progressionQualificationWindowResetOnMiss"), "1");
  assert.equal(formData.get("progressionHasExplicitQualificationWindow"), "1");
  assert.equal(
    formData.get("progressionPromotionGroupedDirectionMapJson"),
    JSON.stringify({
      "time+distance": "down",
      "weight+reps": "up",
    }),
  );
});

test("apply routine default can copy normalized default form values", () => {
  const exercise = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 2.5 },
  });
  const routineDefault = createProgressionPlaybookFormState({
    playbookId: "deload_after_stall",
    config: { version: 1, loadIncrement: 5, stallThreshold: 3, deloadPercent: 12.5 },
  });
  const applied = {
    ...exercise,
    ...routineDefault,
  };

  assert.equal(areProgressionPlaybookFormStatesEqual(applied, routineDefault), true);
  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(applied), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    dayProgressionMode: "unsynced",
    setFlow: "straight_sets",
    stallPolicy: "deload_after_stall",
    stallThreshold: 3,
    deloadPercent: 12.5,
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    repPromotionThreshold: "top_of_range",
  });
});

test("legacy progression configs restore canonical promotion defaults", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
  });

  assert.equal(state.progressionPromotionBasis, "weight_and_reps");
  assert.equal(state.progressionRepPromotionThreshold, "top_of_range");
  assert.equal(state.progressionCustomRepPromotionTarget, "");
  assert.equal(state.progressionTargetMutation, "increase_load_reset_reps");
  assert.equal(state.progressionHasExplicitTargetMutation, false);
  assert.equal(state.progressionRequiredQualifiedSessions, "1");
  assert.equal(state.progressionQualificationWindowMode, "latest");
  assert.equal(state.progressionQualificationWindowResetOnMiss, false);
  assert.equal(state.progressionHasExplicitQualificationWindow, false);
});

test("promotion controls round-trip through progression config serialization", () => {
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "fixed_load_rep_range_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionPromotionBasis: "reps_only" as const,
    progressionRepPromotionThreshold: "custom" as const,
    progressionCustomRepPromotionTarget: "11",
  };

  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    dayProgressionMode: "unsynced",
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "reps_only",
    repPromotionThreshold: "custom",
    customRepPromotionTarget: 11,
  });
});

test("routine promotion measurement family order restores and round-trips through progression config serialization", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      promotionMeasurementOrderMap: {
        strength: ["time", "weight", "reps", "distance"],
        bodyweight: ["distance", "reps", "time", "weight"],
        cardio: ["distance", "time", "reps", "weight"],
      },
    },
  });

  assert.deepEqual(state.progressionStrengthPromotionMeasurements, ["time", "weight", "reps", "distance"]);
  assert.deepEqual(state.progressionBodyweightPromotionMeasurements, ["distance", "reps", "time", "weight"]);
  assert.deepEqual(state.progressionCardioPromotionMeasurements, ["distance", "time", "reps", "weight"]);

  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    dayProgressionMode: "unsynced",
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    promotionMeasurementOrderMap: {
      strength: ["time", "weight", "reps", "distance"],
      bodyweight: ["distance", "reps", "time", "weight"],
      cardio: ["distance", "time", "reps", "weight"],
    },
    repPromotionThreshold: "top_of_range",
  });
});

test("target changes and required successful sessions round-trip through progression config serialization", () => {
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionTargetMutation: "increase_load_and_reps" as const,
    progressionHasExplicitTargetMutation: true,
    progressionRequiredQualifiedSessions: "3",
    progressionQualificationWindowMode: "consecutive" as const,
    progressionQualificationWindowResetOnMiss: true,
    progressionHasExplicitQualificationWindow: true,
  };

  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    dayProgressionMode: "unsynced",
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    targetMutation: "increase_load_and_reps",
    qualificationWindow: {
      requiredQualifiedSessions: 3,
      mode: "consecutive",
      resetOnMiss: true,
    },
    repPromotionThreshold: "top_of_range",
  });
});

test("promotion session count memory round-trips through progression config serialization", () => {
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionPromotionSessionCountMap: {
      time: "3",
      distance: "2",
      reps: "4",
      weight: "1",
    },
    progressionPromotionGroupedSessionCountMap: {
      "time+distance": "2",
      "reps+weight": "3",
    },
    progressionRequiredQualifiedSessions: "3",
    progressionHasExplicitQualificationWindow: true,
  };

  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    dayProgressionMode: "unsynced",
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    promotionSessionCountMap: {
      time: 3,
      distance: 2,
      reps: 4,
      weight: 1,
    },
    promotionGroupedSessionCountMap: {
      "time+distance": 2,
      "reps+weight": 3,
    },
    qualificationWindow: {
      requiredQualifiedSessions: 3,
      mode: "latest",
      resetOnMiss: false,
    },
    repPromotionThreshold: "top_of_range",
  });
});

test("explicit target mutation and qualification window restore from saved config", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      targetMutation: "increase_load_and_reps",
      qualificationWindow: {
        requiredQualifiedSessions: 2,
        mode: "consecutive",
        resetOnMiss: true,
      },
    },
  });

  assert.equal(state.progressionTargetMutation, "increase_load_and_reps");
  assert.equal(state.progressionHasExplicitTargetMutation, true);
  assert.equal(state.progressionRequiredQualifiedSessions, "2");
  assert.equal(state.progressionQualificationWindowMode, "consecutive");
  assert.equal(state.progressionQualificationWindowResetOnMiss, true);
  assert.equal(state.progressionHasExplicitQualificationWindow, true);
});

test("set flow grouping restores blank time and distance defaults and round-trips grouped fields", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      setFlowSteps: {
        loadStep: 5,
        repStep: 2,
      },
      setFlowMeasurementSequence: [
        ["time", "distance"],
        ["reps", "weight"],
      ],
      setFlowCountMap: {
        time: 2,
        distance: 2,
        reps: 3,
        weight: 3,
      },
      setFlowGroupedCountMap: {
        "time+distance": 2,
        "reps+weight": 3,
      },
      setFlowGroupedDirectionMap: {
        "reps+weight": "down",
      },
    },
  });

  assert.equal(state.progressionSetFlowDurationStep, "");
  assert.equal(state.progressionSetFlowDistanceStep, "");
  assert.deepEqual(state.progressionSetFlowMeasurements, ["time", "distance", "reps", "weight"]);
  assert.deepEqual(state.progressionSetFlowLinks, ["and", "then", "and"]);
  assert.equal(state.progressionSetFlowGroupedCountMap["time+distance"], "2");
  assert.equal(state.progressionSetFlowGroupedDirectionMap["reps+weight"], "down");
  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: {
      loadStep: 5,
      repStep: 2,
    },
    dayProgressionMode: "unsynced",
    setFlow: "straight_sets",
    setFlowMeasurementSequence: [
      ["time", "distance"],
      ["reps", "weight"],
    ],
    setFlowCountMap: {
      time: 2,
      distance: 2,
      reps: 3,
      weight: 3,
    },
    setFlowGroupedCountMap: {
      "time+distance": 2,
      "reps+weight": 3,
    },
    setFlowGroupedDirectionMap: {
      "reps+weight": "down",
    },
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    repPromotionThreshold: "top_of_range",
  });
});

test("add-exercise draft can restore the routine default after a local change", () => {
  const routineDefault = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
  });
  const changedBeforeSave = createProgressionPlaybookFormState({
    playbookId: "fixed_load_rep_range_progression",
    config: { version: 1, loadIncrement: 2.5 },
  });
  const restoredBeforeSave = {
    ...changedBeforeSave,
    ...routineDefault,
  };

  assert.equal(areProgressionPlaybookFormStatesEqual(changedBeforeSave, routineDefault), false);
  assert.equal(areProgressionPlaybookFormStatesEqual(restoredBeforeSave, routineDefault), true);
});

test("invalid config fields do not compare equal to valid defaults", () => {
  const invalidExercise = {
    ...createProgressionPlaybookFormState({
      playbookId: "deload_after_stall",
      config: { version: 1, loadIncrement: 5, stallThreshold: 2, deloadPercent: 10 },
    }),
    progressionStallThreshold: "0",
  };
  const routineDefault = createProgressionPlaybookFormState({
    playbookId: "deload_after_stall",
    config: { version: 1, loadIncrement: 5, stallThreshold: 2, deloadPercent: 10 },
  });

  assert.equal(buildProgressionPlaybookConfigFromFormState(invalidExercise), null);
  assert.equal(areProgressionPlaybookFormStatesEqual(invalidExercise, routineDefault), false);
});

test("deload-after-stall config build tolerates missing legacy deload percent state", () => {
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "deload_after_stall",
      config: { version: 1, loadIncrement: 5, stallThreshold: 2, deloadPercent: 10 },
    }),
    progressionDeloadPercent: "",
  };

  const config = buildProgressionPlaybookConfigFromFormState(state);

  assert.ok(config);
  assert.equal(config?.stallThreshold, 2);
  assert.equal("deloadPercent" in (config ?? {}), true);
  assert.equal(config?.deloadPercent, 10);
});

test("training goals seed expected routine default progression presets", () => {
  const buildMuscle = createProgressionPlaybookFormStateForTrainingGoal("build_muscle");
  const buildStrength = createProgressionPlaybookFormStateForTrainingGoal("build_strength");
  const maintain = createProgressionPlaybookFormStateForTrainingGoal("maintain");
  const conditioning = createProgressionPlaybookFormStateForTrainingGoal("conditioning");
  const techniqueRehab = createProgressionPlaybookFormStateForTrainingGoal("technique_rehab");

  assert.equal(buildMuscle.progressionPlaybookId, "double_progression");
  assert.equal(buildStrength.progressionPlaybookId, "double_progression");
  assert.equal(maintain.progressionPlaybookId, "");
  assert.equal(conditioning.progressionPlaybookId, "");
  assert.equal(techniqueRehab.progressionPlaybookId, "");
  assert.equal(buildMuscle.progressionSetFlow, "straight_sets");
  assert.equal(buildStrength.progressionSetFlow, "straight_sets");
  assert.equal(maintain.progressionSetFlow, "straight_sets");
  assert.equal(conditioning.progressionSetFlow, "straight_sets");
  assert.equal(techniqueRehab.progressionSetFlow, "straight_sets");
});

test("training goal customized state detects progression deviation without blanking intent", () => {
  const seeded = createProgressionPlaybookFormStateForTrainingGoal("build_muscle");
  const customized = {
    ...seeded,
    progressionPlaybookId: "fixed_load_rep_range_progression" as const,
  };

  assert.equal(isTrainingGoalCustomized("build_muscle", seeded), false);
  assert.equal(isTrainingGoalCustomized("build_muscle", customized), true);
  assert.equal(isTrainingGoalCustomized("", customized), false);
});

test("training goal customized state detects set flow deviation", () => {
  const seeded = createProgressionPlaybookFormStateForTrainingGoal("build_strength");
  const customized = {
    ...seeded,
    progressionSetFlow: "ascending_ramp" as const,
  };

  assert.equal(isTrainingGoalCustomized("build_strength", seeded), false);
  assert.equal(isTrainingGoalCustomized("build_strength", customized), true);
});

test("training goal layer defaults do not turn goals into executable progression truth", () => {
  assert.equal(getDefaultProgressionLayerModel({ trainingGoal: "build_muscle" }).progressionMethod, "double_progression");
  assert.equal(getDefaultProgressionLayerModel({ trainingGoal: "build_strength" }).regressionPolicy, "deload_after_stall");
  assert.equal(getDefaultProgressionLayerModel({ trainingGoal: "technique_rehab" }).progressionMethod, "manual");
});

test("training goal info definitions expose meaning affects and example copy", () => {
  for (const goal of listTrainingGoalDefinitions()) {
    assert.ok(goal.meaning.trim(), `${goal.label} is missing meaning copy`);
    assert.ok(goal.affects.trim(), `${goal.label} is missing affects copy`);
    assert.ok(goal.example.trim(), `${goal.label} is missing example copy`);
  }
});
