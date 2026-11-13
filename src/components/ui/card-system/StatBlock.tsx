import { Children, type ReactNode } from "react";
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
      {/* Same wrapping trick as CardMeta: each value carries its own leading dot in 12px of left padding that the
          wrapper pulls outside the line box and the dd clips, so a dot never ends or starts a wrapped line. */}
      <dd className={cn(cardTokens.statValue, "m-0 min-w-0 overflow-hidden")}>
        <span className={cardTokens.metaWrap}>
          {visibleValues.map((value, index) => (
            <span key={index} className={cardTokens.metaItem}>
              {index > 0 ? <span aria-hidden="true" className={cardTokens.metaSeparator}>{"·"}</span> : null}
              {value}
            </span>
          ))}
        </span>
      </dd>
    </dl>
  );
}
