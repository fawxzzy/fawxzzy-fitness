import assert from "node:assert/strict";
import test from "node:test";
import { resolveProgressionSectionVisibility } from "@/lib/progression-section-visibility";

test("exercise context hides progression sections when no live measurements are filled", () => {
  const result = resolveProgressionSectionVisibility({
    context: "exercise",
    hasPlaybook: true,
    visiblePromotionStepFieldIds: [],
    renderedSessionMeasurementCount: 0,
    renderedSetMeasurementCount: 0,
    daySettingFieldCount: 0,
    stallPolicy: "deload_after_stall",
  });

  assert.deepEqual(result, {
    shouldRenderPromotionStepSettings: false,
    shouldRenderRegressionControls: false,
    shouldRenderDeloadSettings: false,
    shouldRenderDayAdjustmentSettings: false,
    shouldRenderSessionSettings: false,
    shouldRenderSetStepSettings: false,
    shouldRenderProgressionSettingsRow: false,
  });
});

test("exercise context renders only sections supported by live filled measurements", () => {
  const result = resolveProgressionSectionVisibility({
    context: "exercise",
    hasPlaybook: true,
    visiblePromotionStepFieldIds: ["duration"],
    renderedSessionMeasurementCount: 1,
    renderedSetMeasurementCount: 0,
    daySettingFieldCount: 2,
    stallPolicy: "deload_after_stall",
  });

  assert.deepEqual(result, {
    shouldRenderPromotionStepSettings: true,
    shouldRenderRegressionControls: true,
    shouldRenderDeloadSettings: true,
    shouldRenderDayAdjustmentSettings: true,
    shouldRenderSessionSettings: true,
    shouldRenderSetStepSettings: false,
    shouldRenderProgressionSettingsRow: true,
  });
});

test("routine-default context keeps all progression sections eligible from saved playbook state", () => {
  const result = resolveProgressionSectionVisibility({
    context: "routine-default",
    hasPlaybook: true,
    visiblePromotionStepFieldIds: [],
    renderedSessionMeasurementCount: 0,
    renderedSetMeasurementCount: 0,
    daySettingFieldCount: 0,
    stallPolicy: "none",
  });

  assert.deepEqual(result, {
    shouldRenderPromotionStepSettings: true,
    shouldRenderRegressionControls: true,
    shouldRenderDeloadSettings: false,
    shouldRenderDayAdjustmentSettings: true,
    shouldRenderSessionSettings: true,
    shouldRenderSetStepSettings: true,
    shouldRenderProgressionSettingsRow: true,
  });
});

test("hidden playbook disables all progression sections regardless of measurements", () => {
  const result = resolveProgressionSectionVisibility({
    context: "exercise",
    hasPlaybook: false,
    visiblePromotionStepFieldIds: ["duration", "distance"],
    renderedSessionMeasurementCount: 2,
    renderedSetMeasurementCount: 2,
    daySettingFieldCount: 4,
    stallPolicy: "deload_after_stall",
  });

  assert.deepEqual(result, {
    shouldRenderPromotionStepSettings: false,
    shouldRenderRegressionControls: false,
    shouldRenderDeloadSettings: false,
    shouldRenderDayAdjustmentSettings: false,
    shouldRenderSessionSettings: false,
    shouldRenderSetStepSettings: false,
    shouldRenderProgressionSettingsRow: false,
  });
});
