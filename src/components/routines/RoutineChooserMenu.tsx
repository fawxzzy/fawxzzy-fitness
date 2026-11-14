"use client";

import type { ReactNode } from "react";
import { CardChips, CardHeader, CardMeta, CardStatusChip, CardSurface, type CardHeaderInteraction } from "@/components/ui/card-system";
import { cn } from "@/lib/cn";

/**
 * Chooser cards for the create-routine menu and the add-day screens. They are shared-card-system cards
 * (`CardSurface` + `CardHeader`), the same anatomy as routine, day and exercise cards:
 * - `press`: the whole header runs an action or navigates (right chevron).
 * - `toggle`: the whole header opens or closes a panel (down chevron, `aria-expanded`).
 * - `select`: the whole header picks the card (`aria-pressed`, a visible SELECTED chip).
 */
export type RoutineChooserOptionKind = "press" | "toggle" | "select";

export function RoutineChooserOptionCard({
  title,
  kind = "press",
  active = false,
  disabled = false,
  className,
  onPress,
  controlsId,
}: {
  title: ReactNode;
  kind?: RoutineChooserOptionKind;
  /** `select`: the card is chosen. `toggle`: the panel is open. `press`: the card is the current/highlighted choice. */
  active?: boolean;
  disabled?: boolean;
  className?: string;
  onPress?: () => void;
  controlsId?: string;
}) {
  const handler = onPress ?? (() => undefined);
  const isDisabled = disabled || !onPress;
  const interaction: CardHeaderInteraction =
    kind === "select"
      ? { kind: "select", selected: active, onSelect: handler, disabled: isDisabled }
      : kind === "toggle"
        ? { kind: "toggle", expanded: active, onToggle: handler, disabled: isDisabled, controlsId }
        : { kind: "press", onPress: handler, disabled: isDisabled };

  return (
    <CardSurface tone={active ? "current" : "neutral"} className={cn(disabled ? "opacity-70" : undefined, className)} data-chooser-option={kind}>
      <CardHeader
        headingLevel={3}
        title={title}
        chips={kind === "select" && active ? <CardChips><CardStatusChip status="selected" /></CardChips> : undefined}
        interaction={interaction}
      />
    </CardSurface>
  );
}

/** Titled card that holds a chooser list (duplicate sources) and its confirm footer. */
export function RoutineDuplicateChooserPanel({
  title,
  list,
  footer,
  className,
  id,
}: {
  title: string;
  list: ReactNode;
  footer?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <CardSurface as="section" id={id} className={cn("min-h-0", className)} data-chooser-panel="true">
      <CardHeader headingLevel={3} title={title} />
      <div className="flex min-h-0 flex-col px-3 pb-3">
        {list}
        {footer ? (
          <div className="shrink-0 space-y-3 pt-3">
            {footer}
          </div>
        ) : null}
      </div>
    </CardSurface>
  );
}

/** Selectable routine in the duplicate-routine chooser. Facts are a wrapping meta line (no sideways rail). */
export function RoutineChooserSourceCard({
  title,
  selected = false,
  onPress,
  meta,
  className,
}: {
  title: string;
  selected?: boolean;
  onPress?: () => void;
  meta?: ReactNode[];
  className?: string;
}) {
  return (
    <CardSurface tone={selected ? "current" : "neutral"} className={className} data-chooser-source="routine">
      <CardHeader
        headingLevel={3}
        title={title}
        meta={meta && meta.length > 0 ? <CardMeta items={meta} /> : undefined}
        chips={selected ? <CardChips><CardStatusChip status="selected" /></CardChips> : undefined}
        interaction={onPress ? { kind: "select", selected, onSelect: onPress } : { kind: "none" }}
      />
    </CardSurface>
  );
}
