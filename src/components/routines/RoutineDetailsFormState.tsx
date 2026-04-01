import { AccentSubtitleText } from "@/components/ui/text-roles";

export function RoutineDetailsSaveState({
  error,
  isSaving,
  isDirty,
}: {
  error: string | null;
  isSaving: boolean;
  isDirty: boolean;
}) {
  if (error) {
    return <AccentSubtitleText className="rounded-[1rem] border border-red-300/40 bg-red-50/10 px-3 py-2 text-red-200">{error}</AccentSubtitleText>;
  }

  return (
    <AccentSubtitleText className="text-[rgb(var(--text)/0.7)]">
      {isSaving ? "Saving changes…" : (isDirty ? "Unsaved changes" : "All changes saved")}
    </AccentSubtitleText>
  );
}
