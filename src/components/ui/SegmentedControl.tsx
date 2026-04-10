import Link from "next/link";
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
}) {
  const itemClassName = size === "sm"
    ? cn(
      ACTION_CHROME_CONTROL_CLASS_NAME,
      "min-h-10 min-w-0 flex-1 basis-0 rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] focus-visible:ring-[rgb(var(--accent)/0.2)]",
    )
    : cn(
      ACTION_CHROME_CONTROL_CLASS_NAME,
      "min-h-12 min-w-0 flex-1 basis-0 rounded-[var(--action-chrome-segment-radius-compact)] px-4 text-[13px] font-semibold focus-visible:ring-[rgb(var(--accent)/0.2)]",
    );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        ACTION_CHROME_RAIL_CLASS_NAME,
        ACTION_CHROME_RAIL_GRID_CLASS_NAME,
        "w-full",
        shellClassName,
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const stateClassName = cn(
          ACTION_CHROME_SEGMENTED_CLASS_NAME,
          isActive
            ? "text-[rgb(var(--text-primary))] shadow-[var(--action-chrome-shadow-hover)]"
            : "text-[rgb(var(--text-secondary)/0.9)] shadow-none",
          isActive ? activeClassName : inactiveClassName,
        );
        const intent = isActive ? (option.intent ?? activeIntent) : inactiveIntent;

        if (onChange || !option.href) {
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-action-chrome-intent={intent}
              data-action-chrome-segmented="true"
              data-action-chrome-selected={isActive ? "true" : undefined}
              onClick={() => onChange?.(option.value)}
              className={cn(itemClassName, stateClassName)}
            >
              {option.label}
            </button>
          );
        }

        return (
          <Link
            key={option.value}
            href={option.href}
            role="tab"
            aria-selected={isActive}
            data-action-chrome-intent={intent}
            data-action-chrome-segmented="true"
            data-action-chrome-selected={isActive ? "true" : undefined}
            className={cn(itemClassName, stateClassName)}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
