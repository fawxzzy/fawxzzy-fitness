"use client";

import { useEffect, useState } from "react";
import {
  ACTION_CHROME_CONTROL_CLASS_NAME,
  ACTION_CHROME_SEGMENTED_CLASS_NAME,
  type ActionChromeIntent,
} from "@/components/ui/actionChrome";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { cn } from "@/lib/cn";

type ExpandingChoiceOption = {
  value: string;
  label: string;
  intent?: ActionChromeIntent;
};

const expandingChoiceButtonClassName = cn(
  ACTION_CHROME_CONTROL_CLASS_NAME,
  ACTION_CHROME_SEGMENTED_CLASS_NAME,
  "min-h-10 rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] focus-visible:ring-[rgb(var(--accent)/0.2)]",
);

type ExpandingChoiceRowProps = {
  ariaLabel: string;
  options: ReadonlyArray<ExpandingChoiceOption>;
  value: string;
  onChange?: (value: string) => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
  buttonClassName?: string;
};

export function ExpandingChoiceRow({
  ariaLabel,
  options,
  value,
  onChange,
  expanded,
  onExpandedChange,
  className,
  buttonClassName,
}: ExpandingChoiceRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isControlled = typeof expanded === "boolean";
  const resolvedExpanded = isControlled ? expanded : isExpanded;

  const setExpanded = (nextExpanded: boolean) => {
    if (!isControlled) {
      setIsExpanded(nextExpanded);
    }
    onExpandedChange?.(nextExpanded);
  };

  useEffect(() => {
    if (!isControlled) {
      setIsExpanded(false);
    }
  }, [isControlled, value]);

  const selectedOption = options.find((option) => option.value === value) ?? options[0] ?? null;
  const trailingOptions = options.filter((option) => option.value !== selectedOption?.value);

  if (!selectedOption) {
    return null;
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "w-full max-w-full overflow-visible",
        resolvedExpanded
          ? "grid min-h-10 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center"
          : "flex justify-center",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={resolvedExpanded}
        onClick={() => setExpanded(!resolvedExpanded)}
        data-action-chrome-intent={selectedOption.intent ?? "positive"}
        data-action-chrome-segmented="true"
        data-action-chrome-selected="true"
        className={cn(
          expandingChoiceButtonClassName,
          "relative min-w-[7.25rem] shadow-[var(--action-chrome-shadow-hover)]",
          resolvedExpanded
            ? "col-start-1 justify-self-end mr-2.5"
            : "justify-center",
          buttonClassName,
        )}
      >
        <span className="flex min-w-0 items-center self-center">{selectedOption.label}</span>
        <ChevronRightIcon className={cn("block h-4 w-4 shrink-0 self-center transition-transform", resolvedExpanded ? "rotate-180" : "")} />
      </button>

      {resolvedExpanded ? (
        <>
        <div className="col-start-2 flex min-h-10 min-w-0 items-center justify-center">
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
          {trailingOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange?.(option.value);
                setExpanded(false);
              }}
              data-action-chrome-intent={option.intent ?? "neutral"}
              data-action-chrome-segmented="true"
              className={cn(
                expandingChoiceButtonClassName,
                "min-w-[7.25rem] text-[rgb(var(--text-secondary)/0.9)] shadow-none",
                buttonClassName,
              )}
            >
              <span className="flex items-center self-center">{option.label}</span>
            </button>
          ))}
          </div>
        </div>
        </>
      ) : null}
    </div>
  );
}
