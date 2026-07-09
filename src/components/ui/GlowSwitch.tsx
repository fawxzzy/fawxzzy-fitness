"use client";

import { cn } from "@/lib/cn";

export const GLOW_SWITCH_STANDARD_CLASS_NAME = "h-11 w-[7.35rem] shrink-0";
export const GLOW_SWITCH_STANDARD_STATE_CLASS_NAME = "min-w-[3.15rem]";
export const GLOW_SWITCH_MEASUREMENT_ROW_WRAPPER_CLASS_NAME = "relative top-[4px] inline-flex h-11 shrink-0 items-center justify-center self-center";

export function GlowSwitch({
  checked,
  onClick,
  ariaLabel,
  onLabel = "On",
  offLabel = "Off",
  className,
  stateClassName,
  trackClassName,
  disabled = false,
  ariaDisabled = false,
}: {
  checked: boolean;
  onClick: () => void;
  ariaLabel: string;
  onLabel?: string;
  offLabel?: string;
  className?: string;
  stateClassName?: string;
  trackClassName?: string;
  disabled?: boolean;
  ariaDisabled?: boolean;
}) {
  const isInteractionLocked = disabled || ariaDisabled;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={checked}
      data-locked={ariaDisabled ? "true" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-w-0 items-center justify-between gap-1.5 rounded-full border border-transparent bg-transparent px-[0.42rem] py-[0.22rem] text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-primary))] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.22)] active:scale-[0.985]",
        checked ? "flex-row-reverse" : "flex-row",
        isInteractionLocked ? "cursor-not-allowed opacity-55 active:scale-100" : undefined,
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex min-w-0 flex-1 items-center justify-center px-1 text-center leading-none transition-[color]",
          checked ? "text-[rgb(var(--accent-strong)/0.98)]" : "text-[rgb(var(--accent-yellow-on)/0.96)]",
          stateClassName,
        )}
      >
        {checked ? onLabel : offLabel}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-[1.72rem] w-[2.34rem] shrink-0 rounded-full border transition-[background,border-color,box-shadow]",
          checked
            ? "border-[rgb(var(--accent-strong)/0.52)] bg-[linear-gradient(180deg,rgba(34,197,94,0.42),rgba(10,26,18,0.92))] shadow-[0_0_16px_rgb(var(--accent-strong)/0.18)]"
            : "border-[rgb(var(--accent-yellow-on)/0.42)] bg-[linear-gradient(180deg,rgba(234,179,8,0.22),rgba(35,30,12,0.9))] shadow-[0_0_12px_rgb(var(--accent-yellow-on)/0.08)]",
          trackClassName,
        )}
      />
    </button>
  );
}
