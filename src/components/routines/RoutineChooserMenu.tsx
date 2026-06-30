"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const ROUTINE_CHOOSER_OPTION_CARD_CLASS_NAME = "w-full rounded-[1rem] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.92)] px-3 py-3 text-left shadow-[0_12px_34px_rgba(0,0,0,0.18)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.22)]";
export const ROUTINE_CHOOSER_OPTION_CARD_ACTIVE_CLASS_NAME = "border-[rgb(var(--accent-divider-rgb)/0.32)] bg-[linear-gradient(180deg,rgb(var(--accent-divider-rgb)/0.08),rgb(var(--surface-1-rgb)/0.96))]";
export const ROUTINE_CHOOSER_DUPLICATE_PANEL_CLASS_NAME = "min-h-0 overflow-hidden rounded-[1rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.54)] px-3 py-3";
export const ROUTINE_CHOOSER_DUPLICATE_PANEL_TITLE_CLASS_NAME = "text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-divider-rgb)/0.92)]";
export const ROUTINE_CHOOSER_SOURCE_CARD_CLASS_NAME = "relative w-full overflow-hidden rounded-[1rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.62)] px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.22)]";
export const ROUTINE_CHOOSER_SOURCE_CARD_SELECTED_CLASS_NAME = "border-[rgb(var(--accent-divider-rgb)/0.28)] bg-[linear-gradient(180deg,rgb(var(--accent-divider-rgb)/0.08),rgb(var(--surface-2-rgb)/0.76))]";

export function RoutineChooserOptionCard({
  title,
  rightSlot,
  active = false,
  disabled = false,
  className,
  onPress,
}: {
  title: ReactNode;
  rightSlot?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  onPress?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className={cn(
        ROUTINE_CHOOSER_OPTION_CARD_CLASS_NAME,
        active ? ROUTINE_CHOOSER_OPTION_CARD_ACTIVE_CLASS_NAME : undefined,
        disabled ? "opacity-70" : undefined,
        className,
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0 block text-sm font-semibold text-[rgb(var(--text-primary)/0.98)]">
          {title}
        </span>
        {rightSlot ? <span className={cn("shrink-0", active ? "text-[rgb(var(--accent-divider-rgb)/0.96)]" : "text-[rgb(var(--text-secondary)/0.86)]")}>{rightSlot}</span> : null}
      </span>
    </button>
  );
}

export function RoutineDuplicateChooserPanel({
  title,
  list,
  footer,
  className,
}: {
  title: string;
  list: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(ROUTINE_CHOOSER_DUPLICATE_PANEL_CLASS_NAME, "flex flex-col", className)}>
      <p className={ROUTINE_CHOOSER_DUPLICATE_PANEL_TITLE_CLASS_NAME}>
        {title}
      </p>
      {list}
      {footer ? (
        <div className="shrink-0 space-y-3 pt-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function RoutineChooserSourceCard({
  title,
  selected = false,
  onPress,
  tags,
  recap,
  footer,
  selectedLabel = "Source",
  defaultLabel = "Select",
  className,
}: {
  title: string;
  selected?: boolean;
  onPress?: () => void;
  tags?: ReactNode;
  recap?: ReactNode;
  footer?: ReactNode;
  selectedLabel?: string;
  defaultLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        ROUTINE_CHOOSER_SOURCE_CARD_CLASS_NAME,
        selected ? ROUTINE_CHOOSER_SOURCE_CARD_SELECTED_CLASS_NAME : undefined,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-[3px] rounded-l-[inherit] bg-[rgb(var(--accent-divider-rgb)/0.96)]",
          selected ? "opacity-100" : "opacity-82",
        )}
      />
      <span className="relative z-[1] flex min-w-0 flex-col gap-2 pl-1">
        <span className="flex items-start justify-between gap-3">
          <span className="inline-flex min-w-0 max-w-full flex-col items-start gap-[3px]">
            <span className="block min-w-0 max-w-full whitespace-normal break-words text-[0.92rem] font-semibold leading-[1.12] text-[rgb(var(--text-primary)/0.98)] [text-wrap:balance]">
              {title}
            </span>
            <span className="h-px w-full bg-[rgb(var(--accent-divider-rgb)/0.58)] opacity-90" />
          </span>
          <span className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em]", selected ? "text-[rgb(var(--accent-divider-rgb)/0.96)]" : "text-[rgb(var(--text-secondary)/0.72)]")}>
            {selected ? selectedLabel : defaultLabel}
          </span>
        </span>
        {tags}
        {recap}
        {footer ? (
          <span className="flex justify-end pt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-divider-rgb)/0.94)]">
            {footer}
          </span>
        ) : null}
      </span>
    </button>
  );
}
