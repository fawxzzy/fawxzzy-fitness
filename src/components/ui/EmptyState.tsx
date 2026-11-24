import type { ReactNode } from "react";
import { CardEmptyState } from "@/components/ui/card-system/CardEmptyState";

/**
 * "Nothing here yet" for any list or screen. A thin wrapper over `CardEmptyState` (the one empty-state card: dashed
 * outline, card title scale, plain-text body, one optional action), kept so older imports keep working. The title is
 * a heading (level 2 by default, pass `headingLevel` to fit the page outline); the body says what to do next in plain
 * words, never a red error.
 */
export function EmptyState({
  title,
  body,
  action,
  headingLevel = 2,
  className,
}: {
  title: ReactNode;
  body: ReactNode;
  action?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  return <CardEmptyState title={title} body={body} action={action} headingLevel={headingLevel} className={className} />;
}
