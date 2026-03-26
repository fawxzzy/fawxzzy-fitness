import Link from "next/link";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";

export function QuickAddExerciseSheet({
  sessionId,
}: {
  sessionId: string;
}) {
  return (
    <Link
      href={`/session/${sessionId}/add-exercise?returnTo=${encodeURIComponent(`/session/${sessionId}`)}`}
      className={getAppButtonClassName({ variant: "secondary", size: "md", fullWidth: true })}
    >
      <span>Add Exercise</span>
    </Link>
  );
}
