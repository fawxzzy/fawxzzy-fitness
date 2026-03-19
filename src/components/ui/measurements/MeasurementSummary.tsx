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
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((item) => (
        <span
          key={`${item.metric}-${item.label}`}
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide",
            item.tone === "muted"
              ? "border-border/45 bg-[rgb(var(--bg)/0.24)] text-muted"
              : "border-border/45 bg-[rgb(var(--bg)/0.32)] text-[rgb(var(--text)/0.9)]",
            itemClassName,
          )}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
