import { AccentSubtitleText } from "@/components/ui/text-roles";
import { appTokens } from "@/components/ui/app/tokens";

export function RoutineDetailsSaveState({
  error,
}: {
  error: string | null;
}) {
  if (error) {
    return <AccentSubtitleText className={appTokens.routineEditorStatusError}>{error}</AccentSubtitleText>;
  }

  return null;
}
