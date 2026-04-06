import { BottomDockLink } from "@/components/layout/BottomDockButton";

export function QuickAddExerciseSheet({
  sessionId,
}: {
  sessionId: string;
}) {
  return (
    <BottomDockLink
      href={`/session/${sessionId}/add-exercise?returnTo=${encodeURIComponent(`/session/${sessionId}`)}`}
      intent="positive"
    >
      Add
    </BottomDockLink>
  );
}
