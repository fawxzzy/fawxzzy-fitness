import { appTokens } from "@/components/ui/app/tokens";
import { formatGoalInlineSummaryText } from "@/lib/measurement-display";
import { cn } from "@/lib/cn";

export function GoalSummaryInline({
  values,
  className,
  includeSets = true,
  hideWhenEmpty = false,
}: {
  values: {
    sets?: number | null;
    reps?: number | null;
    repsMax?: number | null;
    weight?: number | null;
    weightUnit?: string | null;
    durationSeconds?: number | null;
    distance?: number | null;
    distanceUnit?: string | null;
    calories?: number | null;
    emptyLabel?: string;
  };
  className?: string;
  includeSets?: boolean;
  hideWhenEmpty?: boolean;
}) {
  const summary = formatGoalInlineSummaryText(includeSets ? values : { ...values, sets: null });
  const isMissing = summary === (values.emptyLabel ?? "Goal missing");
  if (hideWhenEmpty && isMissing) return null;

  return (
    <div className={cn("px-0.5 py-1", className)}>
      {isMissing ? (
        <span className={cn(appTokens.badgeBase, appTokens.summaryMutedBadge)}>
          {summary}
        </span>
      ) : (
        <p className={appTokens.measurementInlineSummary}>{summary}</p>
      )}
    </div>
  );
}
