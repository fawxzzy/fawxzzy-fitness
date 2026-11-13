"use client";

import type { ButtonHTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { cardTokens } from "@/components/ui/card-system/cardTokens";

const GRIP_COLUMNS = [6.5, 13.5];
const GRIP_ROWS = [5, 10, 15];

/** Two-column, three-row grip glyph: the conventional "drag to reorder" affordance. */
export function DragGripGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={cn("h-5 w-5", className)}>
      {GRIP_COLUMNS.flatMap((cx) => GRIP_ROWS.map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.45" fill="currentColor" />))}
    </svg>
  );
}

export type DragHandleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children" | "className" | "aria-label"> & {
  /** Accessible name, for example `Reorder Push`. */
  label: string;
  /** True while this card is being dragged. */
  active?: boolean;
  /**
   * Keyboard alternative to dragging: ArrowUp / ArrowDown request a one-step move.
   * Parents implement it with the same order state their pointer drag uses.
   */
  onMove?: (direction: -1 | 1) => void;
  className?: string;
};

/**
 * Reorder control for routine days and exercises. 44x44 hit area, `touch-none` so pointer dragging is not
 * stolen by page scroll; pointer handlers pass straight through to the parent's existing drag logic.
 */
export function DragHandle({ label, active = false, onMove, onKeyDown, className, ...props }: DragHandleProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !onMove) {
      return;
    }

    // aria-disabled (not `disabled`) keeps the focused handle in the tab order and focused while a reorder saves.
    if (props["aria-disabled"] === true || props["aria-disabled"] === "true") {
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      onMove(event.key === "ArrowUp" ? -1 : 1);
    }
  };

  return (
    <button
      type="button"
      aria-label={label}
      title="Drag to reorder"
      data-card-drag-handle="true"
      data-active={active ? "true" : undefined}
      className={cn(cardTokens.iconControl, "touch-none cursor-grab active:cursor-grabbing", active ? cardTokens.iconControlActive : undefined, className)}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <DragGripGlyph />
    </button>
  );
}

/** Spoken once per handle through `aria-describedby`: the arrow-key alternative to dragging. */
export function CardReorderHint({ id, noun }: { id: string; noun: "day" | "exercise" }) {
  return (
    <span id={id} className="sr-only">
      {`Drag to reorder, or press Arrow Up or Arrow Down to move this ${noun} one position.`}
    </span>
  );
}

/**
 * Polite live region for reorder results ("Push moved to position 2 of 5"). Always mounted so the first
 * announcement is read; pass an empty message when there is nothing to say.
 */
export function CardLiveRegion({ message }: { message: string }) {
  return (
    <p role="status" aria-live="polite" aria-atomic="true" data-card-live-region="true" className="sr-only">
      {message}
    </p>
  );
}

export function formatReorderAnnouncement(args: { name: string; position: number; total: number }) {
  return `${args.name} moved to position ${args.position} of ${args.total}`;
}

/**
 * Escape closes an open card action row and returns focus to the control that opened it (the "Actions for X"
 * icon button inside the card). Attach to the card wrapper's `onKeyDown`.
 */
export function closeCardActionsOnEscape(event: KeyboardEvent<HTMLElement>, open: boolean, onClose: () => void) {
  if (!open || event.key !== "Escape" || event.defaultPrevented) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  onClose();
  event.currentTarget.querySelector<HTMLElement>("[data-card-icon-button][aria-expanded]")?.focus();
}

/** Standalone icon control with a 44px hit area (info, more, close). Always pass an accessible `label`. */
export function CardIconButton({
  label,
  children,
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "aria-label" | "className"> & {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button type="button" aria-label={label} data-card-icon-button="true" className={cn(cardTokens.iconControl, className)} {...props}>
      {children}
    </button>
  );
}

/** Info control used on exercise cards: a circled "i" inside a 44px hit area. */
export function CardInfoButton({
  label,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "aria-label" | "children" | "className"> & { label: string }) {
  return (
    <CardIconButton label={label} {...props}>
      <span
        aria-hidden="true"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgb(var(--accent-divider-rgb)/0.4)] text-[0.85rem] font-semibold leading-none text-[rgb(var(--accent-strong)/0.98)]"
      >
        i
      </span>
    </CardIconButton>
  );
}
