"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Expanded set logger controls (Zac 2026-11-23: "super clean and easy"). One obvious primary action (Log set, Promote
 * look with the `.promote-shine` sweep), quiet pill secondaries, and equal-width toggle chips instead of the old
 * sliding switches that clipped at the card edge. Presentation only: SetLoggerCard owns every handler.
 */

/** "5 reps", "225 lbs" -> "5 reps · 225 lbs" (the summary under the Log set label). */
export function formatLoggerSummary(items: readonly string[]) {
  return items.map((item) => item.trim()).filter(Boolean).join(" · ");
}

/**
 * On/off chip for a logger option (Warm-up, Failure, Timer). A real 44px button; the state is `aria-pressed` plus the
 * filled dot (not colour alone). The accessible name contains the visible word ("Warm-up set" for "Warm-up"), never a
 * state sentence that contradicts it. Under 360px the chip tightens so "Warm-up" fits a third of a 320px card.
 */
export function LoggerToggleChip({
  pressed,
  label,
  ariaLabel,
  onPress,
  inactive = false,
}: {
  pressed: boolean;
  label: string;
  ariaLabel: string;
  onPress: () => void;
  inactive?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={ariaLabel}
      aria-disabled={inactive || undefined}
      data-logger-toggle={label.toLowerCase()}
      onClick={() => {
        if (inactive) {
          return;
        }
        onPress();
      }}
      className={cn(
        "inline-flex h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-full !border px-2 text-[13px] font-semibold max-[359px]:gap-1 max-[359px]:px-1 max-[359px]:text-[12px] leading-none shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.5)] motion-reduce:transition-none aria-disabled:cursor-not-allowed aria-disabled:opacity-55",
        pressed
          ? "!border-[rgb(var(--success-rgb)/0.62)] !bg-[rgb(var(--success-rgb)/0.2)] !text-[rgb(var(--text-primary))]"
          : "!border-[rgb(var(--border-strong)/0.24)] !bg-[rgb(var(--surface-2)/0.35)] !text-[rgb(var(--text-secondary))]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 shrink-0 rounded-full max-[359px]:h-1.5 max-[359px]:w-1.5",
          pressed ? "bg-[rgb(var(--success-rgb))] shadow-[0_0_8px_rgb(var(--success-rgb)/0.7)]" : "border border-[rgb(var(--text-secondary)/0.6)]",
        )}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Quiet secondary pill (Use last, Resync, Log all). Disabled uses aria-disabled so focus never drops mid-save. */
export function LoggerSecondaryButton({
  children,
  onPress,
  inactive = false,
  ariaLabel,
  intent,
  className,
}: {
  children: ReactNode;
  onPress: () => void;
  inactive?: boolean;
  ariaLabel?: string;
  intent?: "info" | "positive";
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-disabled={inactive || undefined}
      data-bottom-action-intent={intent}
      onClick={() => {
        if (inactive) {
          return;
        }
        onPress();
      }}
      className={cn(
        "inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-full !border !border-[rgb(var(--border-strong)/0.26)] !bg-[rgb(var(--surface-2)/0.45)] px-3 text-[13px] font-semibold leading-none !text-[rgb(var(--text-primary))] shadow-none transition-colors hover:!bg-[rgb(var(--surface-2)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.45)] motion-reduce:transition-none aria-disabled:cursor-not-allowed aria-disabled:opacity-55",
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </button>
  );
}

/**
 * The one primary action of the expanded logger: a 56px full-width green pill with the Promote sweep, "Log set" over
 * the values it will save. Disabled (nothing to save, or a save in flight) drops the sweep and dims.
 */
export function LoggerPrimaryLogButton({
  prefix,
  summaryItems,
  inactive,
  onPress,
}: {
  prefix: string;
  summaryItems: readonly string[];
  inactive: boolean;
  onPress: () => void;
}) {
  const summary = formatLoggerSummary(summaryItems);
  const label = prefix === "Log" ? "Log set" : prefix;

  return (
    <button
      type="button"
      aria-disabled={inactive || undefined}
      data-bottom-action-intent="positive"
      data-logger-primary="true"
      onClick={() => {
        if (inactive) {
          return;
        }
        onPress();
      }}
      className={cn(
        "relative inline-flex h-14 w-full min-w-0 items-center justify-center overflow-hidden rounded-full !border px-5 shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.6)] active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 aria-disabled:cursor-not-allowed aria-disabled:active:scale-100",
        inactive
          ? "!border-[rgb(var(--border-strong)/0.18)] !bg-[rgb(var(--surface-2)/0.4)] !text-[rgb(var(--text-secondary))]"
          : "promote-shine !border-[rgb(var(--success-rgb)/0.62)] !bg-[rgb(var(--success-rgb)/0.22)] !text-[rgb(var(--text-primary))] shadow-[0_0_16px_rgb(var(--success-rgb)/0.28)] hover:!bg-[rgb(var(--success-rgb)/0.3)]",
      )}
    >
      <span className="relative flex min-w-0 max-w-full flex-col items-center gap-0.5 leading-tight">
        <span className="text-[15px] font-bold uppercase tracking-[0.08em]">{label}</span>
        {summary ? <span className="max-w-full truncate text-[12px] font-medium tracking-normal text-[rgb(var(--text-secondary))]">{summary}</span> : null}
      </span>
    </button>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]">
      <path d="M4.5 6h11M8 6V4.5h4V6M6 6l.7 9.2a1 1 0 0 0 1 .8h4.6a1 1 0 0 0 1-.8L14 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 44px delete control on a logged set row. It only asks: SetLoggerCard opens the confirm and deletes on Confirm. */
export function LoggedSetDeleteButton({
  ariaLabel,
  pending,
  inactive,
  onPress,
}: {
  ariaLabel: string;
  pending: boolean;
  inactive: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-disabled={inactive || pending || undefined}
      aria-busy={pending || undefined}
      data-bottom-action-intent="danger"
      onClick={() => {
        if (inactive || pending) {
          return;
        }
        onPress();
      }}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full !border !border-[rgb(var(--danger-rgb)/0.32)] !bg-[rgb(var(--danger-rgb)/0.08)] !text-[rgb(var(--danger-rgb))] shadow-none transition-colors hover:!bg-[rgb(var(--danger-rgb)/0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--danger-rgb)/0.45)] motion-reduce:transition-none aria-disabled:cursor-not-allowed aria-disabled:opacity-55"
    >
      <TrashIcon />
    </button>
  );
}
