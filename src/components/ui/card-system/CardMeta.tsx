import { Children, Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { cardTokens } from "@/components/ui/card-system/cardTokens";

/**
 * One meta-line style for every card: 12px, secondary text, items separated by a middle dot.
 * Separators are decorative (aria-hidden); the text reads as a plain list of facts.
 * Falsy items are dropped so callers can pass conditional parts.
 */
export function CardMeta({
  items,
  id,
  flush = false,
  className,
}: {
  items: ReactNode[];
  id?: string;
  /** Drop the default 2px top margin (use when the meta line is not directly under a title). */
  flush?: boolean;
  className?: string;
}) {
  const visibleItems = Children.toArray(items).filter((item) => item !== "");

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <p id={id} data-card-meta="true" className={cn(cardTokens.meta, flush ? undefined : "mt-0.5", className)}>
      {visibleItems.map((item, index) => (
        <Fragment key={index}>
          {index > 0 ? <span aria-hidden="true" className={cardTokens.metaSeparator}>{"·"}</span> : null}
          <span className="min-w-0">{item}</span>
        </Fragment>
      ))}
    </p>
  );
}
