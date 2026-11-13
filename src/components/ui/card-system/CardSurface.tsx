import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { type CardTone, cardTokens, resolveCardToneClassNames } from "@/components/ui/card-system/cardTokens";

type CardSurfaceElement = "div" | "article" | "section";

/**
 * The one card surface. Every routine, day, exercise, summary and empty-state card renders on it.
 * - Radius, outline and tint come from theme variables (no per-card radius/border overrides).
 * - `tone` drives the leading 4px status rail and a matching inset ring (see cardSemanticTones.ts).
 *   Tone is always paired with a text cue (chip or label) so colour is never the only signal.
 * - `empty` switches the outline to dashed for "nothing here yet" cards.
 */
export function CardSurface({
  as = "div",
  tone = "neutral",
  empty = false,
  showRail = true,
  allowOverflow = false,
  className,
  children,
  ...props
}: Omit<HTMLAttributes<HTMLElement>, "children"> & {
  as?: CardSurfaceElement;
  tone?: CardTone;
  empty?: boolean;
  showRail?: boolean;
  /** Let content escape the rounded clip (needed for a sticky header inside the card). */
  allowOverflow?: boolean;
  children: ReactNode;
}) {
  const Component = as;
  const toneClassNames = resolveCardToneClassNames(tone);

  return (
    <Component
      data-card-surface="true"
      data-card-tone={tone}
      className={cn(cardTokens.surface, toneClassNames.shell, empty ? cardTokens.surfaceDashed : undefined, allowOverflow ? "!overflow-visible" : undefined, className)}
      {...props}
    >
      {showRail ? <span aria-hidden="true" data-card-rail="true" className={cn(cardTokens.rail, toneClassNames.rail)} /> : null}
      <div className="relative z-[1] min-w-0">{children}</div>
    </Component>
  );
}
