import type { DayEditorMode } from "@/features/day-editor/mode";

export type DayCtaDockState =
  | { variant: "edit_exercise" }
  | { variant: "add_exercise" }
  | { variant: "rest_toggle_only" }
  | { variant: "hidden" };

export function getDayCtaDockState(mode: DayEditorMode): DayCtaDockState {
  if (mode === "editing_exercise") return { variant: "edit_exercise" };
  if (mode === "default") return { variant: "add_exercise" };
  if (mode === "rest_day") return { variant: "rest_toggle_only" };
  return { variant: "hidden" };
}
