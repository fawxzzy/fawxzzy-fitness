import test from "node:test";
import assert from "node:assert/strict";
import {
  areProgressionPlaybookFormStatesEqual,
  buildProgressionPlaybookConfigFromFormState,
  createProgressionPlaybookFormState,
  createProgressionPlaybookFormStateForTrainingGoal,
  isTrainingGoalCustomized,
} from "@/lib/progression-playbook-form-state";
import {
  getDefaultProgressionLayerModel,
  listTrainingGoalDefinitions,
} from "@/lib/progression-playbooks";

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
  durationSecondsStep: 30,
  distanceStep: 0.5,
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
  assert.equal(state.progressionRequiredQualifiedSessions, "1");
  assert.equal(state.progressionHasExplicitTargetMutation, false);
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
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "reps_only",
    repPromotionThreshold: "custom",
    customRepPromotionTarget: 11,
  });
});

test("target changes round-trip through progression config serialization", () => {
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionTargetMutation: "increase_load_and_reps" as const,
    progressionHasExplicitTargetMutation: true,
  };

  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    repPromotionThreshold: "top_of_range",
    targetMutation: "increase_load_and_reps",
  });
});

test("qualification window count round-trips through progression config serialization", () => {
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionRequiredQualifiedSessions: "3",
    progressionHasExplicitQualificationWindow: true,
  };

  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    repPromotionThreshold: "top_of_range",
    qualificationWindow: {
      requiredQualifiedSessions: 3,
      mode: "latest",
      resetOnMiss: false,
    },
  });
});

test("effort wave day overrides round-trip through progression config serialization", () => {
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionEffortWaveDays: [
      { cycleDayIndex: 2, direction: "up" as const, magnitude: "one_step" as const, percent: null },
      { cycleDayIndex: 4, direction: "down" as const, magnitude: "one_step" as const, percent: null },
    ],
    progressionHasExplicitEffortWave: true,
  };

  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    repPromotionThreshold: "top_of_range",
    effortWave: {
      enabled: true,
      anchor: "routine_cycle",
      days: [
        { cycleDayIndex: 2, direction: "up", magnitude: "one_step", percent: null },
        { cycleDayIndex: 4, direction: "down", magnitude: "one_step", percent: null },
      ],
    },
  });
});

test("effort wave config restores from saved progression config", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      effortWave: {
        enabled: true,
        anchor: "routine_cycle",
        days: [
          { cycleDayIndex: 3, direction: "up" },
        ],
      },
    },
  });

  assert.deepEqual(state.progressionEffortWaveDays, [
    { cycleDayIndex: 3, direction: "up", magnitude: "one_step", percent: null },
  ]);
  assert.equal(state.progressionHasExplicitEffortWave, true);
});

test("focus rotation round-trips through progression config serialization", () => {
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionFocusRotation: "speed_power" as const,
    progressionHasExplicitFocusRotation: true,
  };

  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    repPromotionThreshold: "top_of_range",
    focusRotation: {
      focus: "speed_power",
    },
  });
});

test("focus rotation restores from saved progression config", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      focusRotation: {
        focus: "hypertrophy",
      },
    },
  });

  assert.equal(state.progressionFocusRotation, "hypertrophy");
  assert.equal(state.progressionHasExplicitFocusRotation, true);
});

test("blank focus rotation does not serialize hidden advisory config", () => {
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionFocusRotation: "" as const,
    progressionHasExplicitFocusRotation: false,
  };

  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    setFlow: "straight_sets",
    stallPolicy: "none",
    autoUpdateRoutineGoals: false,
    promotionBasis: "weight_and_reps",
    repPromotionThreshold: "top_of_range",
  });
});

test("invalid qualification window input restores safe defaults", () => {
  const state = createProgressionPlaybookFormState({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      qualificationWindow: {
        requiredQualifiedSessions: 0,
      },
    },
  });

  assert.equal(state.progressionRequiredQualifiedSessions, "1");
  assert.equal(state.progressionQualificationWindowMode, "latest");
  assert.equal(state.progressionQualificationWindowResetOnMiss, false);
});

test("invalid custom promotion target falls back safely during config build", () => {
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionRepPromotionThreshold: "custom" as const,
    progressionCustomRepPromotionTarget: "not-a-number",
  };

  assert.deepEqual(buildProgressionPlaybookConfigFromFormState(state), {
    version: 1,
    loadIncrement: 5,
    stepOverrides: defaultStepOverrides,
    setFlowSteps: defaultSetFlowSteps,
    setFlow: "straight_sets",
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
