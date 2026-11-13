import { Children, Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { cardTokens } from "@/components/ui/card-system/cardTokens";

/**
 * Label + value line used for exercise targets and summary stats ("Target  4 sets · 5 reps · 225 lbs").
 * Label is an 11px eyebrow, values are 14px semibold and joined with a middle dot.
 * Rendered as a description list so label and value stay associated for assistive tech.
 */
export function StatBlock({
  label,
  values,
  className,
}: {
  label: ReactNode;
  values: ReactNode[];
  className?: string;
}) {
  const visibleValues = Children.toArray(values).filter((value) => value !== "");

  if (visibleValues.length === 0) {
    return null;
  }

  return (
    <dl data-card-stat="true" className={cn("m-0 grid min-w-0 gap-1", className)}>
      <dt className={cardTokens.statLabel}>{label}</dt>
      <dd className={cn(cardTokens.statValue, "m-0 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5")}>
        {visibleValues.map((value, index) => (
          <Fragment key={index}>
            {index > 0 ? <span aria-hidden="true" className={cardTokens.metaSeparator}>{"·"}</span> : null}
            <span className="min-w-0">{value}</span>
          </Fragment>
        ))}
      </dd>
    </dl>
  );
}
