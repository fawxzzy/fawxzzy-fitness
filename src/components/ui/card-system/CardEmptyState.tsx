import type { ReactNode } from "react";
import { CardSurface } from "@/components/ui/card-system/CardSurface";
import { cardTokens } from "@/components/ui/card-system/cardTokens";

/**
 * Empty state for a list of cards: same surface (dashed outline), same title/meta type scale, one optional action.
 * Titles are headings; the body is plain text, so nothing here relies on colour.
 */
export function CardEmptyState({
  title,
  body,
  action,
  headingLevel = 2,
  className,
}: {
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <CardSurface empty showRail={false} data-card-empty="true" className={className}>
      <div className="grid gap-2 px-4 py-4">
        <Heading className={cardTokens.title}>{title}</Heading>
        {body ? <p className="m-0 text-sm leading-snug text-[rgb(var(--text-secondary)/0.95)]">{body}</p> : null}
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </CardSurface>
  );
}
