import { AccentSubtitleText } from "@/components/ui/text-roles";

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
    return <AccentSubtitleText className="rounded-[1rem] border border-red-300/40 bg-red-50/10 px-3 py-2 text-red-200">{error}</AccentSubtitleText>;
  }

  const statusText = isSaving
    ? "Saving changes…"
    : isDirty
      ? "Unsaved changes"
      : mode === "edit"
        ? "All changes saved"
        : "Complete routine details to create a new routine";

  return (
    <AccentSubtitleText className="text-[rgb(var(--text)/0.7)]">
      {statusText}
    </AccentSubtitleText>
  );
}
