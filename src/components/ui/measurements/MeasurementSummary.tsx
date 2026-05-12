import { appTokens } from "@/components/ui/app/tokens";
import { formatMeasurementSummaryItems } from "@/lib/measurement-display";
import { cn } from "@/lib/cn";

export function MeasurementSummary({
  values,
  emptyLabel,
  className,
  itemClassName,
}: {
  values: {
    reps?: number | null;
    weight?: number | null;
    weightUnit?: string | null;
    durationSeconds?: number | null;
    distance?: number | null;
    distanceUnit?: string | null;
    calories?: number | null;
  };
  emptyLabel?: string;
  className?: string;
  itemClassName?: string;
}) {
  const items = formatMeasurementSummaryItems({ ...values, emptyLabel });

  return (
    <div className={cn(appTokens.exerciseLogSummaryBadgeRow, className)}>
      {items.map((item) => (
        <span
          key={`${item.metric}-${item.label}`}
          className={cn(
            appTokens.badgeBase,
            item.tone === "muted"
              ? appTokens.summaryMutedBadge
              : appTokens.defaultBadge,
            itemClassName,
          )}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
