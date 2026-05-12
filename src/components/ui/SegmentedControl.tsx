"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KeyboardEvent } from "react";
import {
  ACTION_CHROME_CONTROL_CLASS_NAME,
  ACTION_CHROME_RAIL_CLASS_NAME,
  ACTION_CHROME_RAIL_GRID_CLASS_NAME,
  ACTION_CHROME_SEGMENTED_CLASS_NAME,
  type ActionChromeIntent,
} from "@/components/ui/actionChrome";
import { cn } from "@/lib/cn";

type SegmentedControlOption = {
  label: string;
  value: string;
  href?: string;
  intent?: ActionChromeIntent;
};

function focusSegmentTab(args: {
  currentTarget: HTMLElement;
  value: string;
}) {
  const { currentTarget, value } = args;
  const nextTab = currentTarget.parentElement?.querySelector<HTMLElement>(
    `[role="tab"][data-segmented-control-value="${value}"]`,
  );
  if (!nextTab) {
    return null;
  }

  window.requestAnimationFrame(() => {
    nextTab.focus();
  });

  return nextTab;
}

function getNextSegmentIndex(args: {
  key: string;
  currentIndex: number;
  optionCount: number;
}) {
  const { key, currentIndex, optionCount } = args;
  if (optionCount <= 0) return currentIndex;

  if (key === "Home") return 0;
  if (key === "End") return optionCount - 1;
  if (key === "ArrowRight" || key === "ArrowDown") return (currentIndex + 1) % optionCount;
  if (key === "ArrowLeft" || key === "ArrowUp") return (currentIndex - 1 + optionCount) % optionCount;
  return currentIndex;
}

export function SegmentedControl({
  options,
  value,
  className,
  size = "default",
  ariaLabel = "Segmented options",
  onChange,
  shellClassName,
  activeClassName,
  inactiveClassName,
  activeIntent = "info",
  inactiveIntent = "neutral",
  fitContent = false,
}: {
  options: SegmentedControlOption[];
  value: string;
  className?: string;
  size?: "default" | "sm";
  ariaLabel?: string;
  onChange?: (value: string) => void;
  shellClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  activeIntent?: ActionChromeIntent;
  inactiveIntent?: ActionChromeIntent;
  fitContent?: boolean;
}) {
  const pathname = usePathname();
  const shouldPrefetchLinks = !(pathname === "/dev" || pathname?.startsWith("/dev/"));
  const itemClassName = size === "sm"
    ? cn(
      ACTION_CHROME_CONTROL_CLASS_NAME,
      fitContent
        ? "min-h-10 min-w-fit shrink-0 rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] focus-visible:ring-[rgb(var(--accent)/0.2)]"
        : "min-h-10 min-w-0 flex-1 basis-0 rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] focus-visible:ring-[rgb(var(--accent)/0.2)]",
    )
    : cn(
      ACTION_CHROME_CONTROL_CLASS_NAME,
      fitContent
        ? "min-h-12 min-w-fit shrink-0 rounded-[var(--action-chrome-segment-radius-compact)] px-4 text-[13px] font-semibold focus-visible:ring-[rgb(var(--accent)/0.2)]"
        : "min-h-12 min-w-0 flex-1 basis-0 rounded-[var(--action-chrome-segment-radius-compact)] px-4 text-[13px] font-semibold focus-visible:ring-[rgb(var(--accent)/0.2)]",
    );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        ACTION_CHROME_RAIL_CLASS_NAME,
        ACTION_CHROME_RAIL_GRID_CLASS_NAME,
        fitContent ? "w-fit" : "w-full",
        shellClassName,
        className,
      )}
    >
      {options.map((option, optionIndex) => {
        const isActive = option.value === value;
        const stateClassName = cn(
          ACTION_CHROME_SEGMENTED_CLASS_NAME,
          isActive
            ? "text-[rgb(var(--text-primary))] shadow-[var(--action-chrome-shadow-hover)]"
            : "text-[rgb(var(--text-secondary)/0.9)] shadow-none",
          isActive ? activeClassName : inactiveClassName,
        );
        const intent = isActive ? (option.intent ?? activeIntent) : inactiveIntent;
        const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
          const nextIndex = getNextSegmentIndex({
            key: event.key,
            currentIndex: optionIndex,
            optionCount: options.length,
          });

          if (nextIndex === optionIndex) {
            return;
          }

          event.preventDefault();
          const nextOption = options[nextIndex];
          if (!nextOption) {
            return;
          }

          if (onChange || !nextOption.href) {
            onChange?.(nextOption.value);
            focusSegmentTab({
              currentTarget: event.currentTarget,
              value: nextOption.value,
            });
            return;
          }

          const nextTab = focusSegmentTab({
            currentTarget: event.currentTarget,
            value: nextOption.value,
          });
          if (!nextTab) {
            return;
          }

          window.requestAnimationFrame(() => {
            nextTab.click();
          });
        };

        if (onChange || !option.href) {
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              data-action-chrome-intent={intent}
              data-action-chrome-segmented="true"
              data-action-chrome-selected={isActive ? "true" : undefined}
              onClick={() => onChange?.(option.value)}
              onKeyDown={handleKeyDown}
              className={cn(itemClassName, stateClassName)}
              data-segmented-control-value={option.value}
            >
              {option.label}
            </button>
          );
        }

        return (
          <Link
            key={option.value}
            href={option.href}
            prefetch={shouldPrefetchLinks}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            data-action-chrome-intent={intent}
            data-action-chrome-segmented="true"
            data-action-chrome-selected={isActive ? "true" : undefined}
            onKeyDown={handleKeyDown}
            className={cn(itemClassName, stateClassName)}
            data-segmented-control-value={option.value}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
