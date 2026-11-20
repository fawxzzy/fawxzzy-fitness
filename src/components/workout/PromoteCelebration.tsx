"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * Promote celebration: the "stats upgrade" box shown after a manual promote succeeds. Presentation only: the caller
 * passes the before/after values it already has (from the promote result) and decides when to open it; nothing
 * here applies, saves or computes a progression.
 *
 *   ┌──────────────────────────────┐
 *   │        PROGRESSION UP        │
 *   │         Back Squat           │
 *   │  Reps     8   →   9     +1   │
 *   │  Weight  60 kg → 60 kg       │
 *   │          [ Continue ]        │
 *   └──────────────────────────────┘
 */

export type PromoteStatRow = {
  /** Stat name, for example `Reps`, `Weight`, `Time`. */
  label: string;
  /** Value before the promote, as displayed (`8`, `60 kg`, `18:00`). */
  from: string;
  /** Value after the promote, as displayed. */
  to: string;
};

const LEADING_NUMBER = /^(-?\d+(?:\.\d+)?)(.*)$/;

/**
 * Change badge for a stat row: `+1`, `+5 lbs`, `+0:30`, or null when the value did not change or cannot be compared
 * (different units, ranges, words). Clock values compare in seconds and print as a clock.
 */
export function formatPromoteStatDelta(from: string, to: string): string | null {
  const a = from.trim();
  const b = to.trim();
  if (a === b) {
    return null;
  }

  const clock = (value: string) => {
    const match = value.match(/^(\d+):(\d{2})$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const clockFrom = clock(a);
  const clockTo = clock(b);
  if (clockFrom !== null && clockTo !== null) {
    const diff = clockTo - clockFrom;
    if (diff === 0) return null;
    const abs = Math.abs(diff);
    return `${diff > 0 ? "+" : "−"}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
  }

  const matchFrom = a.match(LEADING_NUMBER);
  const matchTo = b.match(LEADING_NUMBER);
  if (!matchFrom || !matchTo) {
    return null;
  }
  const unitFrom = matchFrom[2].trim();
  const unitTo = matchTo[2].trim();
  if (unitFrom !== unitTo || /[–-]\d/.test(unitFrom)) {
    return null;
  }
  const diff = Math.round((Number(matchTo[1]) - Number(matchFrom[1])) * 100) / 100;
  if (diff === 0) {
    return null;
  }
  return `${diff > 0 ? "+" : "−"}${Math.abs(diff)}${unitTo ? ` ${unitTo}` : ""}`;
}

export function PromoteCelebration({
  open,
  exerciseName,
  rows,
  onClose,
}: {
  open: boolean;
  exerciseName: string;
  rows: PromoteStatRow[];
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(<PromoteCelebrationDialog titleId={titleId} exerciseName={exerciseName} rows={rows} onClose={onClose} closeRef={closeRef} />, document.body);
}

/** The dialog body, exported for static rendering in tests (the portal needs a document). */
export function PromoteCelebrationDialog({
  titleId,
  exerciseName,
  rows,
  onClose,
  closeRef,
}: {
  titleId: string;
  exerciseName: string;
  rows: PromoteStatRow[];
  onClose: () => void;
  closeRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-promote-celebration="true"
      className="fixed inset-0 z-[120] flex items-center justify-center p-5 pt-[max(1.25rem,var(--app-safe-top))] pb-[max(1.25rem,var(--app-safe-bottom))]"
    >
      <div aria-hidden="true" className="fixed inset-0 bg-[rgb(var(--bg-app)/0.72)] backdrop-blur-[6px]" onClick={onClose} />
      <div className="relative w-full max-w-[21rem] animate-promote-rise motion-reduce:animate-none">
        {/* Outer glow ring: success colour, the "upgrade" frame. */}
        <div aria-hidden="true" className="pointer-events-none absolute -inset-px rounded-[calc(var(--card-radius)+1px)] bg-[linear-gradient(160deg,rgb(var(--success-rgb)/0.85),rgb(var(--accent)/0.25)_45%,rgb(var(--success-rgb)/0.6))] shadow-[0_0_28px_rgb(var(--success-rgb)/0.38),0_18px_48px_rgb(0_0_0/0.45)]" />
        <div className="relative overflow-hidden rounded-[var(--card-radius)] bg-[rgb(var(--surface-1-rgb)/0.97)] px-5 pb-5 pt-6 text-center">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-exercise-glint bg-[linear-gradient(90deg,transparent,rgb(var(--text-primary)/0.12),transparent)] motion-reduce:hidden" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_top,rgb(var(--success-rgb)/0.28),transparent_70%)]" />
          <p className="relative m-0 text-[11px] font-bold uppercase tracking-[0.22em] text-[rgb(var(--success-rgb))]">Progression up</p>
          <h2 id={titleId} className="relative m-0 mt-1.5 text-xl font-semibold leading-tight tracking-[-0.02em] text-[rgb(var(--text-primary))] [overflow-wrap:anywhere]">
            {exerciseName}
          </h2>
          <dl className="relative m-0 mt-4 grid gap-1.5 text-left">
            {rows.map((row) => {
              const delta = formatPromoteStatDelta(row.from, row.to);
              return (
                <div
                  key={row.label}
                  data-promote-row={row.label}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[calc(var(--card-radius)*0.6)] border px-3 py-2.5",
                    delta
                      ? "border-[rgb(var(--success-rgb)/0.45)] bg-[rgb(var(--success-rgb)/0.1)]"
                      : "border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-3-rgb)/0.35)]",
                  )}
                >
                  <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted)/0.98)]">{row.label}</dt>
                  <dd className="m-0 flex items-center gap-2 text-sm font-semibold tabular-nums">
                    <span className={cn(delta ? "text-[rgb(var(--text-muted)/0.98)]" : "text-[rgb(var(--text-secondary)/0.98)]")}>{row.from}</span>
                    <span aria-hidden="true" className={cn(delta ? "text-[rgb(var(--success-rgb))]" : "text-[rgb(var(--text-muted)/0.8)]")}>→</span>
                    <span className="sr-only">to</span>
                    <span className={cn(delta ? "text-[rgb(var(--text-primary))] [text-shadow:0_0_12px_rgb(var(--success-rgb)/0.6)]" : "text-[rgb(var(--text-secondary)/0.98)]")}>{row.to}</span>
                    {delta ? (
                      <span data-promote-delta="true" className="ml-0.5 rounded-full bg-[rgb(var(--success-rgb)/0.22)] px-2 py-0.5 text-xs font-bold text-[rgb(var(--success-rgb))]">{delta}</span>
                    ) : null}
                  </dd>
                </div>
              );
            })}
          </dl>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            data-promote-close="true"
            className="relative mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full !border !border-[rgb(var(--success-rgb)/0.6)] !bg-[rgb(var(--success-rgb)/0.22)] text-sm font-semibold !text-[rgb(var(--text-primary))] transition-colors hover:!bg-[rgb(var(--success-rgb)/0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.6)] motion-reduce:transition-none"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
