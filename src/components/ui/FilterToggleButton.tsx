"use client";

import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
import { ACTION_CHROME_CONTROL_CLASS_NAME, ACTION_CHROME_SEGMENTED_CLASS_NAME } from "@/components/ui/actionChrome";
import { cn } from "@/lib/cn";

type FilterToggleButtonProps = {
  open: boolean;
  active?: boolean;
  onClick: () => void;
  ariaLabel: string;
  labelText?: string;
  className?: string;
  countBadge?: number | null;
};

export function FilterToggleButton({
  open,
  active = false,
  onClick,
  ariaLabel,
  labelText,
  className,
  countBadge,
}: FilterToggleButtonProps) {
  const showCountBadge = typeof countBadge === "number" && countBadge > 0;
  const isHighlighted = open || active;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={ariaLabel}
      data-action-chrome-intent={isHighlighted ? "toggleActive" : "neutral"}
      data-action-chrome-selected={isHighlighted ? "true" : undefined}
      className={cn(
        ACTION_CHROME_CONTROL_CLASS_NAME,
        ACTION_CHROME_SEGMENTED_CLASS_NAME,
        "relative inline-flex min-h-11 min-w-[3.45rem] items-center justify-between gap-2 rounded-full px-2.5 pl-3 pr-1.5 focus-visible:ring-[rgb(var(--accent)/0.22)]",
        className,
      )}
    >
      {showCountBadge ? (
        <span className="absolute -left-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full border border-[rgb(var(--accent)/0.34)] bg-[rgb(var(--accent)/0.18)] px-1 text-[9px] font-semibold leading-none text-[rgb(var(--text-primary)/0.98)]">
          {countBadge}
        </span>
      ) : null}
      <span aria-hidden="true" className="inline-flex h-full min-w-0 flex-1 items-center justify-start">
        {labelText ? (
          <span
            className={cn(
              "truncate text-[10px] font-semibold uppercase tracking-[0.12em]",
              isHighlighted ? "text-[rgb(var(--accent)/0.96)]" : "text-[rgb(var(--text-primary)/0.9)]",
            )}
          >
            {labelText}
          </span>
        ) : (
          <span className="inline-flex flex-col items-start justify-center gap-[3px]">
            <span
              className={cn(
                "block h-[1.5px] w-[12px] rounded-full bg-current transition-colors",
                isHighlighted ? "text-[rgb(var(--accent)/0.96)]" : "text-[rgb(var(--text-muted)/0.96)]",
              )}
            />
            <span
              className={cn(
                "block h-[1.5px] w-[7px] rounded-full bg-current transition-colors",
                isHighlighted ? "text-[rgb(var(--accent)/0.96)]" : "text-[rgb(var(--text-muted)/0.96)]",
              )}
            />
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          isHighlighted
            ? "border-[rgb(var(--accent)/0.34)] bg-[rgb(var(--accent)/0.16)] text-[rgb(var(--accent)/0.98)]"
            : "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.34)] text-[rgb(var(--text-muted)/0.9)]",
        )}
      >
        {open ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
      </span>
    </button>
  );
}
