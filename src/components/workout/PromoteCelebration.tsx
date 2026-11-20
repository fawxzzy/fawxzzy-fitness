"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * Promote box: the "stats upgrade" modal of the manual Promote flow. Two phases:
 * - `confirm`: "Ready to promote", current -> next goal rows, optional linked-day chooser (`children`), Not now / Promote.
 *   While `pending` the Promote button reads "Promoting..." (aria-disabled) and nothing closes the box.
 * - `done` (default): "Progression up", before -> after rows from the promote result, Continue.
 * Presentation only: the caller passes the values, runs the action and switches the phase; nothing here applies,
 * saves or computes a progression.
 *
 *   ┌──────────────────────────────┐
 *   │        PROGRESSION UP        │
 *   │         Back Squat           │
 *   │  Reps     8   →   9     +1   │
 *   │  Weight  60 kg → 60 kg       │
 *   │          [ Continue ]        │
 *   └──────────────────────────────┘
 */

export type PromoteCelebrationPhase = "confirm" | "done";

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
  phase = "done",
  onConfirm,
  pending = false,
  confirmDisabled = false,
  children,
}: {
  open: boolean;
  exerciseName: string;
  rows: PromoteStatRow[];
  onClose: () => void;
  phase?: PromoteCelebrationPhase;
  /** Confirm phase: runs the promote. Not called while `pending` or `confirmDisabled`. */
  onConfirm?: () => void;
  pending?: boolean;
  confirmDisabled?: boolean;
  /** Confirm phase: extra content under the rows (the linked-day chooser). */
  children?: ReactNode;
}) {
  const titleId = useId();
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const pendingRef = useRef(pending);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!pendingRef.current) onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  // Focus the primary button when the box opens and again when it turns from confirm to done.
  useEffect(() => {
    if (open) primaryRef.current?.focus();
  }, [open, phase]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <PromoteCelebrationDialog
      titleId={titleId}
      exerciseName={exerciseName}
      rows={rows}
      onClose={onClose}
      primaryRef={primaryRef}
      phase={phase}
      onConfirm={onConfirm}
      pending={pending}
      confirmDisabled={confirmDisabled}
    >
      {children}
    </PromoteCelebrationDialog>,
    document.body,
  );
}

/** The dialog body, exported for static rendering in tests (the portal needs a document). */
export function PromoteCelebrationDialog({
  titleId,
  exerciseName,
  rows,
  onClose,
  primaryRef,
  phase = "done",
  onConfirm,
  pending = false,
  confirmDisabled = false,
  children,
}: {
  titleId: string;
  exerciseName: string;
  rows: PromoteStatRow[];
  onClose: () => void;
  primaryRef?: React.Ref<HTMLButtonElement>;
  phase?: PromoteCelebrationPhase;
  onConfirm?: () => void;
  pending?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
}) {
  const confirming = phase === "confirm";
  const confirmBlocked = pending || confirmDisabled;
  const close = () => {
    if (!pending) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-promote-celebration="true"
      data-promote-phase={phase}
      aria-busy={pending || undefined}
      className="fixed inset-0 z-[120] flex items-center justify-center p-5 pt-[max(1.25rem,var(--app-safe-top))] pb-[max(1.25rem,var(--app-safe-bottom))]"
    >
      <div aria-hidden="true" className="fixed inset-0 bg-[rgb(var(--bg-app)/0.72)] backdrop-blur-[6px]" onClick={close} />
      <div className="relative w-full max-w-[21rem] animate-promote-rise motion-reduce:animate-none">
        {/* Outer glow ring: success colour, the "upgrade" frame. */}
        <div aria-hidden="true" className="pointer-events-none absolute -inset-px rounded-[calc(var(--card-radius)+1px)] bg-[linear-gradient(160deg,rgb(var(--success-rgb)/0.85),rgb(var(--accent)/0.25)_45%,rgb(var(--success-rgb)/0.6))] shadow-[0_0_28px_rgb(var(--success-rgb)/0.38),0_18px_48px_rgb(0_0_0/0.45)]" />
        <div className="relative overflow-hidden rounded-[var(--card-radius)] bg-[rgb(var(--surface-1-rgb)/0.97)] px-5 pb-5 pt-6 text-center">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-exercise-glint bg-[linear-gradient(90deg,transparent,rgb(var(--text-primary)/0.12),transparent)] motion-reduce:hidden" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_top,rgb(var(--success-rgb)/0.28),transparent_70%)]" />
          <p className="relative m-0 text-[11px] font-bold uppercase tracking-[0.22em] text-[rgb(var(--success-rgb))]">{confirming ? "Ready to promote" : "Progression up"}</p>
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
          {confirming && children ? <div className="relative mt-3 text-left">{children}</div> : null}
          {confirming ? (
            <div className="relative mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                data-promote-close="true"
                className="inline-flex min-h-11 items-center justify-center rounded-full !border !border-[rgb(var(--border-strong)/0.28)] !bg-[rgb(var(--surface-3-rgb)/0.5)] text-sm font-semibold !text-[rgb(var(--text-secondary))] transition-colors hover:!bg-[rgb(var(--surface-3-rgb)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.6)] disabled:opacity-60 motion-reduce:transition-none"
              >
                Not now
              </button>
              <button
                ref={primaryRef}
                type="button"
                aria-disabled={confirmBlocked || undefined}
                onClick={() => {
                  if (confirmBlocked) return;
                  onConfirm?.();
                }}
                data-promote-confirm="true"
                className="inline-flex min-h-11 items-center justify-center rounded-full !border !border-[rgb(var(--success-rgb)/0.6)] !bg-[rgb(var(--success-rgb)/0.22)] text-sm font-semibold !text-[rgb(var(--text-primary))] transition-colors hover:!bg-[rgb(var(--success-rgb)/0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.6)] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 motion-reduce:transition-none"
              >
                {pending ? "Promoting..." : "Promote"}
              </button>
            </div>
          ) : (
            <button
              ref={primaryRef}
              type="button"
              onClick={onClose}
              data-promote-close="true"
              className="relative mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full !border !border-[rgb(var(--success-rgb)/0.6)] !bg-[rgb(var(--success-rgb)/0.22)] text-sm font-semibold !text-[rgb(var(--text-primary))] transition-colors hover:!bg-[rgb(var(--success-rgb)/0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.6)] motion-reduce:transition-none"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
