"use client";

import { cn } from "@/lib/cn";

/**
 * Promote button on a full bar. The card only draws the button and calls `onPromote`; it never applies a progression
 * or reads the database. Today wires it to the manual Promote flow (`TodayDayPicker`: confirm box, then
 * `promoteExerciseAction`); a caller without a handler gets no button.
 */
export type ExerciseProgressPromote = {
  /** Called once per tap; the caller owns pending state and the confirm step. */
  onPromote: () => void;
  /** While true the button reads "Promoting..." and ignores taps (aria-disabled keeps focus on it). */
  pending?: boolean;
};

export type ExerciseRowCardProgress = {
  /** Plain-text progress, for example `2 / 4 sets` or `Progression: Ready`. The bar is decorative; this text carries the meaning. */
  label: string;
  /** 0-100, or null when there is no bar to draw (text only). */
  percent: number | null;
  /** `complete` uses the success colour for the bar; the label still says what is complete. */
  tone?: "default" | "complete";
  /** Promote button at the right end of the bar. Rendered only when the bar is full (100%) and a handler is given. */
  promote?: ExerciseProgressPromote | null;
};

export function clampProgressPercent(percent: number | null) {
  return percent === null || !Number.isFinite(percent) ? null : Math.max(0, Math.min(100, Math.round(percent)));
}

/** The one rule for the Promote button: a full bar and a wired handler, nothing else. */
export function shouldShowProgressPromote(progress: Pick<ExerciseRowCardProgress, "percent" | "promote">) {
  return clampProgressPercent(progress.percent) === 100 && typeof progress.promote?.onPromote === "function";
}

/**
 * Text label split into a quiet kicker and a value when it reads "Kicker: value" ("Progression: Ready");
 * otherwise the whole label is the value ("2 / 4 sets"). Same type, same weights for both cards.
 */
function ProgressLabel({ label }: { label: string }) {
  const split = label.indexOf(": ");
  const kicker = split > 0 ? label.slice(0, split) : null;
  const value = split > 0 ? label.slice(split + 2) : label;

  return (
    <p className="m-0 flex min-w-0 items-baseline gap-1.5 text-xs font-semibold leading-snug tabular-nums">
      {kicker ? <span className="text-[rgb(var(--text-muted)/0.98)]">{kicker}<span className="sr-only">:</span></span> : null}
      <span className="min-w-0 text-[rgb(var(--text-secondary)/0.98)]">{value}</span>
    </p>
  );
}

export function ExerciseProgressPromoteButton({ promote, exerciseName }: { promote: ExerciseProgressPromote; exerciseName: string }) {
  const pending = Boolean(promote.pending);

  return (
    <button
      type="button"
      data-exercise-promote="true"
      aria-label={pending ? `Promoting ${exerciseName}` : `Promote ${exerciseName}`}
      aria-disabled={pending || undefined}
      onClick={() => {
        if (pending) {
          return;
        }
        promote.onPromote();
      }}
      // Card control: restates background, border and colour with `!` (globals.css button rule, cardTokens note).
      className="group relative z-10 -my-2 -mr-1.5 inline-flex min-h-11 shrink-0 items-center justify-center rounded-full !border-0 !bg-transparent px-1.5 !text-[rgb(var(--text-primary))] focus-visible:outline-none aria-disabled:cursor-not-allowed"
    >
      <span className="relative inline-flex h-8 items-center overflow-hidden rounded-full border border-[rgb(var(--success-rgb)/0.62)] bg-[rgb(var(--success-rgb)/0.2)] px-3 text-xs font-bold uppercase tracking-[0.08em] text-[rgb(var(--text-primary))] shadow-[0_0_14px_rgb(var(--success-rgb)/0.28)] transition-colors group-hover:bg-[rgb(var(--success-rgb)/0.28)] group-focus-visible:ring-2 group-focus-visible:ring-[rgb(var(--accent)/0.6)] group-aria-disabled:opacity-60 motion-reduce:transition-none">
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/2 animate-exercise-glint bg-[linear-gradient(90deg,transparent,rgb(var(--text-primary)/0.32),transparent)] motion-reduce:hidden" />
        <span className="relative">{pending ? "Promoting..." : "Promote"}</span>
      </span>
    </button>
  );
}

/**
 * Progress row shared by Today (progression) and the in-progress workout (logged sets): text first, then a
 * left-anchored 6px bar, and at 100% with a wired handler the Promote button at the bar's right end. The only shine
 * is on that button (three passes, none under reduced motion); a full bar alone stays still.
 */
export function ExerciseProgressBar({ progress, exerciseName }: { progress: ExerciseRowCardProgress; exerciseName: string }) {
  const percent = clampProgressPercent(progress.percent);
  const complete = progress.tone === "complete";
  const showPromote = shouldShowProgressPromote(progress);

  return (
    <div data-exercise-row-progress="true" data-progress-percent={percent ?? undefined} className="grid gap-1.5">
      <ProgressLabel label={progress.label} />
      {percent !== null ? (
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="relative block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[rgb(var(--surface-3-rgb)/0.72)]">
            <span
              data-exercise-progress-fill="true"
              className={cn(
                "relative block h-full overflow-hidden rounded-full",
                complete
                  ? "bg-[rgb(var(--success-rgb)/0.96)] shadow-[0_0_10px_rgb(var(--success-rgb)/0.45)]"
                  : "bg-[rgb(var(--accent)/0.82)]",
              )}
              style={{ width: `${percent}%` }}
            />
          </span>
          {showPromote && progress.promote ? <ExerciseProgressPromoteButton promote={progress.promote} exerciseName={exerciseName} /> : null}
        </div>
      ) : null}
    </div>
  );
}
