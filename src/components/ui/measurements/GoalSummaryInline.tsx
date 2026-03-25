import { formatGoalInlineSummaryText } from "@/lib/measurement-display";
import { cn } from "@/lib/cn";

export function GoalSummaryInline({
  values,
  className,
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
}) {
  const summary = formatGoalInlineSummaryText(values);
  const isMissing = summary === (values.emptyLabel ?? "Goal missing");

  return (
    <div className={cn("px-0.5 py-1", className)}>
      {isMissing ? (
        <span className="inline-flex items-center rounded-full border border-border/45 bg-[rgb(var(--bg)/0.24)] px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted">
          {summary}
        </span>
      ) : (
        <p className="text-sm text-[rgb(var(--text)/0.88)]">{summary}</p>
      )}
    </div>
  );
}
