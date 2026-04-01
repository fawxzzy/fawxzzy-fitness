export type DayEditorScreenMode =
  | "default"
  | "reorder"
  | "rest_day"
  | "editing_exercise"
  | "adding_exercise";

export type DayEditorModeContext = {
  isRestDay: boolean;
  isReorderMode: boolean;
  hasExpandedExercise: boolean;
  isAddingExercise: boolean;
};

export type DayEditorModeViewModel = {
  mode: DayEditorScreenMode;
  shouldShowHeaderReorderAction: boolean;
  shouldShowHeaderCloseEditorAction: boolean;
  shouldShowExerciseList: boolean;
  shouldShowRestState: boolean;
  shouldShowBottomEditDock: boolean;
  shouldShowBottomAddCta: boolean;
  isExerciseListInteractive: boolean;
  shouldShowAddExerciseCtaInSection: boolean;
};

export function resolveDayEditorMode(context: DayEditorModeContext): DayEditorScreenMode {
  if (context.isRestDay) return "rest_day";
  if (context.isAddingExercise) return "adding_exercise";
  if (context.hasExpandedExercise) return "editing_exercise";
  if (context.isReorderMode) return "reorder";
  return "default";
}

export function getDayEditorModeViewModel(context: DayEditorModeContext): DayEditorModeViewModel {
  const mode = resolveDayEditorMode(context);

  return {
    mode,
    shouldShowHeaderReorderAction: mode === "default" || mode === "reorder",
    shouldShowHeaderCloseEditorAction: mode === "editing_exercise",
    shouldShowExerciseList: mode !== "rest_day",
    shouldShowRestState: mode === "rest_day",
    shouldShowBottomEditDock: mode === "editing_exercise",
    shouldShowBottomAddCta: mode === "default",
    isExerciseListInteractive: mode === "default" || mode === "editing_exercise",
    shouldShowAddExerciseCtaInSection: mode === "default",
  };
}
