import { type ReactNode } from "react";
import { type ExerciseGoalFormState, type RoutineEditorInfoPayload } from "@/components/ui/measurements/ExerciseGoalForm";
import type { MeasurementPanelAuxiliaryField } from "@/components/ui/measurements/MeasurementPanelV2";
import { type ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import { type ExerciseCurationTags } from "@/lib/exercise-curation";
import { type GoalModality } from "@/lib/exercise-goal-validation";

export type ExerciseOption = {
  id: string;
  exercise_id?: string | null;
  name: string;
  user_id: string | null;
  is_global: boolean;
  primary_muscle: string | null;
  primary_muscles?: string[] | null;
  secondary_muscles?: string[] | null;
  equipment: string | null;
  movement_pattern: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance" | "none";
  default_unit: string | null;
  calories_estimation_method: string | null;
  image_howto_path: string | null;
  how_to_short?: string | null;
  image_icon_path?: string | null;
  slug?: string | null;
  curation_tags?: ExerciseCurationTags | string | null;
} & {
  tags?: string[] | string | null;
  tag?: string[] | string | null;
  categories?: string[] | string | null;
  category?: string[] | string | null;
  muscles?: string[] | string | null;
  muscle?: string[] | string | null;
};

export type ExercisePickerProps = {
  exercises: ExerciseOption[];
  name: string;
  initialSelectedId?: string;
  initialCustomExerciseDraft?: {
    name?: string;
    primaryMuscle?: string | null;
    secondaryMuscle?: string | null;
    movementPattern?: string | null;
    equipment?: string | null;
  };
  selectionSearchParam?: string;
  exerciseStats?: ExerciseStatsOption[];
  routineTargetConfig?: {
    weightUnit: "lbs" | "kg";
  };
  goalExtraContent?: ReactNode | ((context: {
    selectedExercise: ExerciseOption | undefined;
    goalState: ExerciseGoalFormState;
    goalModality: GoalModality;
    effectiveGoalModality: GoalModality;
    failureToggleInfoContent: RoutineEditorInfoPayload | null;
  }) => ReactNode);
  goalBetweenInputsAndPreviewContent?: ReactNode | ((context: {
    selectedExercise: ExerciseOption | undefined;
    goalState: ExerciseGoalFormState;
    goalModality: GoalModality;
    effectiveGoalModality: GoalModality;
    failureToggleInfoContent: RoutineEditorInfoPayload | null;
  }) => ReactNode);
  goalDockViewportMode?: "default" | "compact" | ((context: {
    selectedExercise: ExerciseOption | undefined;
    goalState: ExerciseGoalFormState;
    goalModality: GoalModality;
    effectiveGoalModality: GoalModality;
    failureToggleInfoContent: RoutineEditorInfoPayload | null;
  }) => "default" | "compact");
  goalCompanionToggleCards?: ReactNode[] | ((context: {
    selectedExercise: ExerciseOption | undefined;
    goalState: ExerciseGoalFormState;
    goalModality: GoalModality;
    effectiveGoalModality: GoalModality;
    failureToggleInfoContent: RoutineEditorInfoPayload | null;
  }) => ReactNode[]);
  goalLowerCompanionToggleCards?: ReactNode[] | ((context: {
    selectedExercise: ExerciseOption | undefined;
    goalState: ExerciseGoalFormState;
    goalModality: GoalModality;
    effectiveGoalModality: GoalModality;
    failureToggleInfoContent: RoutineEditorInfoPayload | null;
  }) => ReactNode[]);
  goalAuxiliaryFields?: MeasurementPanelAuxiliaryField[] | ((context: {
    selectedExercise: ExerciseOption | undefined;
    goalState: ExerciseGoalFormState;
    goalModality: GoalModality;
    effectiveGoalModality: GoalModality;
    failureToggleInfoContent: RoutineEditorInfoPayload | null;
  }) => MeasurementPanelAuxiliaryField[]);
  goalInlineFailureToggle?: boolean;
  footerSlot?: ReactNode;
  onSelectedExerciseChange?: (exercise: ExerciseOption | null) => void;
  onApplyLastSelection?: (selection: {
    exerciseId: string;
    progressionPlaybookId: string | null;
    progressionPlaybookConfig: Record<string, unknown> | null;
  }) => void;
  onClearLastSelection?: (selection: { exerciseId: string }) => void;
  customExerciseEnabled?: boolean;
  renderFooter?: (context: {
    selectedExercise: ExerciseOption | undefined;
    selectedCanonicalExerciseId: string | null;
    filteredExercises: ExerciseOption[];
    openExerciseInfo: () => void;
    goalValidation: { isValid: boolean; message: string };
    isCustomExerciseSelected: boolean;
    customExerciseError: string | null;
    canToggleLastSelection: boolean;
    didApplyLastSelection: boolean;
    onToggleLastSelection: () => void;
  }) => ReactNode;
};

export type TagFilterGroup = "primary_muscle" | "secondary_muscle" | "movement" | "equipment" | "other";

export type ExerciseRowProps = {
  exercise: ExerciseOption;
  isSelected: boolean;
  hasStats: boolean;
  metadataItems: string[];
  selectedSummaryText?: string;
  onOpenInfo?: () => void;
  onPress: (exerciseId: string, isSelected: boolean) => void;
};

export type CustomExerciseRowProps = {
  isSelected: boolean;
  value: string;
  onValueChange: (nextValue: string) => void;
  fieldLabel: string;
  helperText?: ReactNode;
  helperTone?: "neutral" | "warning" | "accent";
  showStatusSeparator?: boolean;
  selectedTags?: string[];
  targetSummaryText?: string;
  targetSummaryTone?: "neutral" | "warning" | "accent";
  onPress: () => void;
};

export type CustomExerciseFilterSectionKey = "primary" | "secondary" | "movement" | "equipment";

export type ExerciseRowCueClasses = {
  leadTextClassName: string;
  unselectedRailClassName: string;
  selectedMediaClassName: string;
  selectedSummaryLabelClassName: string;
  dockAccentBarClassName: string;
  dockShellClassName: string;
};
