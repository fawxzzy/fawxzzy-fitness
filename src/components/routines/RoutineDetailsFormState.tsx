import { AccentSubtitleText } from "@/components/ui/text-roles";
import { appTokens } from "@/components/ui/app/tokens";

type RoutineDetailsSaveStateMode = "create" | "edit";

export function RoutineDetailsSaveState({
  error,
  isSaving,
  isDirty,
  mode,
}: {
  error: string | null;
  isSaving: boolean;
  isDirty: boolean;
  mode: RoutineDetailsSaveStateMode;
}) {
  if (error) {
    return <AccentSubtitleText className={appTokens.routineEditorStatusError}>{error}</AccentSubtitleText>;
  }

  const statusText = isSaving
    ? "Saving changes…"
    : isDirty
      ? "Unsaved changes"
      : mode === "edit"
        ? "All changes saved"
        : "Complete routine details to create a new routine";

  return (
    <AccentSubtitleText className={appTokens.routineEditorStatusText}>
      {statusText}
    </AccentSubtitleText>
  );
}
