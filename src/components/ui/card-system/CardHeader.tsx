"use client";

import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { cn } from "@/lib/cn";
import { cardTokens } from "@/components/ui/card-system/cardTokens";

export type CardHeaderButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "onClick" | "disabled" | "className" | "children" | "aria-expanded" | "aria-controls" | "aria-labelledby" | "aria-describedby"
> & {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

export type CardHeaderInteraction =
  /** Static card: no tap target. */
  | { kind: "none" }
  /** Whole header navigates or runs an action. Shows a right chevron. */
  | { kind: "press"; onPress: () => void; disabled?: boolean; buttonProps?: CardHeaderButtonProps }
  /** Whole header expands or collapses a panel. Shows a down chevron that rotates; wires aria-expanded/controls. */
  | { kind: "toggle"; expanded: boolean; onToggle: () => void; controlsId?: string; disabled?: boolean; buttonProps?: CardHeaderButtonProps }
  /** Whole header selects the card (chooser lists). Wires aria-pressed; no chevron. */
  | { kind: "select"; selected: boolean; onSelect: () => void; disabled?: boolean; buttonProps?: CardHeaderButtonProps };

export type CardHeadingLevel = 2 | 3 | 4;

/**
 * Card header anatomy (the same on routine, day and exercise cards):
 *
 *   [leading]  Title (heading)  secondary          [trailing controls] [chevron]
 *              meta - meta - meta
 *              [chip] [chip]
 *
 * - `leading` is decorative media; `trailing` holds controls (drag handle, info), ordered [info] [handle] then the chevron.
 * - `title` is a real heading (`headingLevel`, default 3), so screen readers can jump between cards.
 * - `interaction` makes the whole header one stretched, labelled button (name = title, description = meta).
 *   Standalone controls (`trailing` drag handle, info, more) are siblings above the hit area, so
 *   there are never nested interactive elements and each keeps its own 44px target.
 * - The chevron is decorative and always the last item: right = navigates, down/rotated = expands.
 */
export function CardHeader({
  title,
  titleSecondary,
  meta,
  chips,
  details,
  leading,
  trailing,
  interaction = { kind: "none" },
  headingLevel = 3,
  className,
  mainClassName,
  trailingClassName,
}: {
  title: ReactNode;
  titleSecondary?: ReactNode;
  meta?: ReactNode;
  chips?: ReactNode;
  /** Extra read-only block under the chips (for example a StatBlock target). Never interactive. */
  details?: ReactNode;
  /** Decorative media only (thumbnail). Controls belong in `trailing`. */
  leading?: ReactNode;
  trailing?: ReactNode;
  interaction?: CardHeaderInteraction;
  headingLevel?: CardHeadingLevel;
  className?: string;
  mainClassName?: string;
  /** Layout override for the trailing controls (exercise rows stack them vertically). */
  trailingClassName?: string;
}) {
  const instanceId = useId();
  const titleId = `${instanceId}-title`;
  const metaId = `${instanceId}-meta`;
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const showsAffordance = interaction.kind === "press" || interaction.kind === "toggle";
  const hasMeta = meta !== null && meta !== undefined && meta !== false;

  return (
    <div data-card-header="true" className={cn(cardTokens.headerRow, className)}>
      {leading ? <div data-card-leading="true" className={cardTokens.headerLeading}>{leading}</div> : null}
      <div className={cn(cardTokens.headerMain, !leading ? "pl-3" : undefined, mainClassName)}>
        <Heading id={titleId} data-card-title="true" className={cardTokens.title}>
          {title}
          {titleSecondary ? <span className={cardTokens.titleSecondary}>{titleSecondary}</span> : null}
        </Heading>
        {hasMeta ? <div id={metaId}>{meta}</div> : null}
        {chips}
        {details ? <div data-card-details="true" className="mt-2">{details}</div> : null}
      </div>
      {trailing ? <div data-card-trailing="true" className={cn(cardTokens.headerTrailing, trailingClassName)}>{trailing}</div> : null}
      {showsAffordance ? (
        <span aria-hidden="true" data-card-affordance={interaction.kind} className={cn(cardTokens.affordance, "relative z-10")}>
          {interaction.kind === "toggle" ? (
            <ChevronDownIcon
              className={cn(
                "h-5 w-5 transition-transform duration-150 motion-reduce:transition-none",
                interaction.expanded ? "rotate-180 text-[rgb(var(--accent)/0.95)]" : undefined,
              )}
            />
          ) : (
            <ChevronRightIcon className="h-5 w-5" />
          )}
        </span>
      ) : null}
      {interaction.kind !== "none" ? (
        <button
          type="button"
          {...interaction.buttonProps}
          className={cardTokens.headerHit}
          onClick={interaction.kind === "press" ? interaction.onPress : interaction.kind === "select" ? interaction.onSelect : interaction.onToggle}
          disabled={interaction.disabled}
          aria-labelledby={titleId}
          aria-describedby={hasMeta ? metaId : undefined}
          aria-expanded={interaction.kind === "toggle" ? interaction.expanded : undefined}
          aria-pressed={interaction.kind === "select" ? interaction.selected : undefined}
          aria-controls={interaction.kind === "toggle" ? interaction.controlsId : undefined}
          data-card-hit={interaction.kind}
        />
      ) : null}
    </div>
  );
}
