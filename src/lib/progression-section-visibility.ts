import type { PromotionStepFieldId } from "@/lib/progression-playbook-ui-options";
import type { ProgressionStallPolicy } from "@/lib/progression-playbooks";

export function resolveProgressionSectionVisibility(args: {
  context: "routine-default" | "exercise";
  hasPlaybook: boolean;
  visiblePromotionStepFieldIds?: PromotionStepFieldId[] | null;
  renderedSessionMeasurementCount: number;
  renderedSetMeasurementCount: number;
  daySettingFieldCount: number;
  stallPolicy: ProgressionStallPolicy;
  showProgressionSettingsRow?: boolean;
}) {
  const isRoutineDefaultContext = args.context === "routine-default";
  const hasLiveExerciseMeasurements = (args.visiblePromotionStepFieldIds?.length ?? 0) > 0;
  const shouldRenderPromotionStepSettings = args.hasPlaybook && (isRoutineDefaultContext || hasLiveExerciseMeasurements);
  const shouldRenderRegressionControls = args.hasPlaybook && (isRoutineDefaultContext || hasLiveExerciseMeasurements);
  const shouldRenderDeloadSettings = shouldRenderRegressionControls && args.stallPolicy === "deload_after_stall";
  const shouldRenderDayAdjustmentSettings = args.hasPlaybook && (isRoutineDefaultContext || args.daySettingFieldCount > 0);
  const shouldRenderSessionSettings = args.hasPlaybook && (isRoutineDefaultContext || args.renderedSessionMeasurementCount > 0);
  const shouldRenderSetStepSettings = args.hasPlaybook && (isRoutineDefaultContext || args.renderedSetMeasurementCount > 0);
  const shouldRenderProgressionSettingsRow = (args.showProgressionSettingsRow ?? true)
    && (shouldRenderPromotionStepSettings || shouldRenderDeloadSettings || shouldRenderSetStepSettings);

  return {
    shouldRenderPromotionStepSettings,
    shouldRenderRegressionControls,
    shouldRenderDeloadSettings,
    shouldRenderDayAdjustmentSettings,
    shouldRenderSessionSettings,
    shouldRenderSetStepSettings,
    shouldRenderProgressionSettingsRow,
  };
}
