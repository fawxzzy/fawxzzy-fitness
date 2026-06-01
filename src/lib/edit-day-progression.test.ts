import assert from "node:assert/strict";
import test from "node:test";

import { buildProgressionPlaybookConfigFromFormState, createProgressionPlaybookFormState, type ProgressionPlaybookFormState } from "./progression-playbook-form-state.ts";
import { resolveEditDayAutoProgressionState, resolveEditDayConfigDayAdjustmentDirection } from "./edit-day-progression.ts";

test("edit-day progression stays hidden when every exercise is manual", () => {
  assert.deepEqual(
    resolveEditDayAutoProgressionState({
      exercises: [
        { playbookId: null, config: null },
        { playbookId: "", config: null },
      ],
      dayIndex: 2,
    }),
    {
      showDayAdjustmentControl: false,
      initialDayAdjustmentDirection: "straight",
    },
  );
});

test("edit-day progression resolves the current day adjustment from an auto progression config", () => {
  const effortWaveDirections: ProgressionPlaybookFormState["progressionEffortWaveDirections"] = ["straight", "down", "up", "straight", "straight", "straight", "straight"];
  const state = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionEffortWaveDirections: effortWaveDirections,
  };
  const config = buildProgressionPlaybookConfigFromFormState(state);

  assert.equal(
    resolveEditDayConfigDayAdjustmentDirection({
      playbookId: "double_progression",
      config,
      dayIndex: 2,
    }),
    "down",
  );
});

test("edit-day progression falls back to straight when auto exercises disagree on day adjustment", () => {
  const downDirections: ProgressionPlaybookFormState["progressionEffortWaveDirections"] = ["straight", "down", "straight", "straight", "straight", "straight", "straight"];
  const upDirections: ProgressionPlaybookFormState["progressionEffortWaveDirections"] = ["straight", "up", "straight", "straight", "straight", "straight", "straight"];
  const downState = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionEffortWaveDirections: downDirections,
  };
  const upState = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionEffortWaveDirections: upDirections,
  };

  assert.deepEqual(
    resolveEditDayAutoProgressionState({
      exercises: [
        {
          playbookId: "double_progression",
          config: buildProgressionPlaybookConfigFromFormState(downState),
        },
        {
          playbookId: "double_progression",
          config: buildProgressionPlaybookConfigFromFormState(upState),
        },
      ],
      dayIndex: 2,
    }),
    {
      showDayAdjustmentControl: true,
      initialDayAdjustmentDirection: "straight",
    },
  );
});

test("edit-day progression keeps the shared direction when all auto exercises match", () => {
  const downDirections: ProgressionPlaybookFormState["progressionEffortWaveDirections"] = ["straight", "down", "straight", "straight", "straight", "straight", "straight"];
  const downState = {
    ...createProgressionPlaybookFormState({
      playbookId: "double_progression",
      config: { version: 1, loadIncrement: 5 },
    }),
    progressionEffortWaveDirections: downDirections,
  };

  assert.deepEqual(
    resolveEditDayAutoProgressionState({
      exercises: [
        {
          playbookId: "double_progression",
          config: buildProgressionPlaybookConfigFromFormState(downState),
        },
        {
          playbookId: "double_progression",
          config: buildProgressionPlaybookConfigFromFormState(downState),
        },
      ],
      dayIndex: 2,
    }),
    {
      showDayAdjustmentControl: true,
      initialDayAdjustmentDirection: "down",
    },
  );
});
