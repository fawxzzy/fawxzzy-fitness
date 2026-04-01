export type DayEditorMode =
  | "default"
  | "reorder"
  | "editing_exercise"
  | "adding_exercise"
  | "rest_day";

export type DayEditorModeContext = {
  isRestDay: boolean;
  isReorderMode: boolean;
  hasExpandedExercise: boolean;
  isAddingExercise: boolean;
};

export type DayEditorSections = {
  exerciseListVisible: boolean;
  restDayCardVisible: boolean;
};

export type DayEditorModeViewModel = {
  mode: DayEditorMode;
  headerAction: "reorder_toggle" | "close_editor" | "none";
  sections: DayEditorSections;
  exerciseListInteractive: boolean;
  addExerciseAvailable: boolean;
};

export function resolveDayEditorMode(context: DayEditorModeContext): DayEditorMode {
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
    headerAction: mode === "editing_exercise"
      ? "close_editor"
      : (mode === "default" || mode === "reorder" ? "reorder_toggle" : "none"),
    sections: {
      exerciseListVisible: mode !== "rest_day",
      restDayCardVisible: mode === "rest_day",
    },
    exerciseListInteractive: mode === "default" || mode === "editing_exercise",
    addExerciseAvailable: mode === "default",
  };
}
