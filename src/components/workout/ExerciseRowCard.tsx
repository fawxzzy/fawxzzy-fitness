"use client";

import type { ReactNode } from "react";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import {
  CardHeader,
  CardMeta,
  CardSurface,
  type CardHeaderInteraction,
  type CardHeadingLevel,
  type CardTone,
} from "@/components/ui/card-system";
import { ExerciseProgressBar, type ExerciseRowCardProgress } from "@/components/workout/ExerciseProgressBar";
import { cn } from "@/lib/cn";
import { formatExerciseGoalDisplay } from "@/lib/exercise-goal-display";
import type { ExerciseThumbSourceKind } from "@/lib/exerciseImages";

export type { ExerciseProgressPromote, ExerciseRowCardProgress } from "@/components/workout/ExerciseProgressBar";

export type ExerciseRowCardVisual = {
  name: string;
  slug?: string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  thumbnailUrl?: string | null;
  thumbnailSource?: ExerciseThumbSourceKind | null;
};

const EXERCISE_ROW_THUMB_SIZE = 56;

/** Check mark beside a finished exercise's title: success colour, a short pop and three soft glow pulses, still under reduced motion. */
export function ExerciseDoneCheck() {
  return (
    <span
      data-exercise-done-check="true"
      className="ml-2 inline-flex h-5 w-5 shrink-0 -translate-y-px items-center justify-center rounded-full bg-[rgb(var(--success-rgb)/0.2)] align-middle text-[rgb(var(--success-rgb))] ring-1 ring-[rgb(var(--success-rgb)/0.55)] animate-exercise-done motion-reduce:animate-none"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
      </svg>
      <span className="sr-only">, done</span>
    </span>
  );
}

/** Goal line: one formatter for every card (`4 × 5 @ 225 lbs`, `18:00 · 2 km`); the spoken form is for screen readers. */
function ExerciseGoalLine({ values }: { values: string[] }) {
  const goal = formatExerciseGoalDisplay(values);
  if (!goal) {
    return null;
  }

  return (
    <p data-exercise-goal="true" className="m-0 text-[15px] font-semibold leading-snug tabular-nums tracking-[-0.005em] text-[rgb(var(--text-primary))]">
      <span aria-hidden="true">{goal.text}</span>
      <span className="sr-only">{`Goal: ${goal.spoken}`}</span>
    </p>
  );
}

/**
 * Exercise card: planned exercise on the day editor, Today, view-day and the in-progress workout.
 *
 *   Exercise name ✓                                       [thumb]
 *   Quads · Squat
 *   4 × 5 @ 225 lbs
 *   Progression  Ready
 *   ██████████████████████████ [Promote]                  [info] [handle]   [chevron]
 *   (expanded) editor or set-logger panel
 *   (footer) attached action strip
 *
 * Text starts at the left edge so the name, meta and goal scan as one column. The thumbnail is decorative and sits
 * top-right; the controls (info, drag handle) sit bottom-right, in thumb reach and at the end of the reading order,
 * on the same line as the progress bar. No status bubbles: finished is a check beside the name, skipped and added
 * keep their text chip.
 */
export function ExerciseRowCard({
  exercise,
  metaItems,
  targetValues,
  noTargetLabel,
  progress,
  completed = false,
  chips,
  showMedia = true,
  interaction,
  trailing,
  tone = "neutral",
  headingLevel = 2,
  panel,
  panelProps,
  footer,
  stickyHeader = false,
  allowOverflow = false,
  titleAccessory,
  showAffordance = true,
  className,
}: {
  exercise: ExerciseRowCardVisual;
  metaItems: string[];
  /** Goal parts as stored (`["4 sets", "5 reps", "225 lbs"]`); `formatExerciseGoalDisplay` turns them into one line. */
  targetValues: string[];
  /** Quiet line shown instead of the goal when `targetValues` is empty (Today: "No goal set"; the card never says "Target"). Off by default. */
  noTargetLabel?: string | null;
  /** Logged-set or progression progress: a text label with an optional decorative bar and the Promote seam. */
  progress?: ExerciseRowCardProgress | null;
  /** Finished exercise: a check mark beside the title (replaces the old "Done" chip). */
  completed?: boolean;
  /** Status chips (`CardChips` with `CardChip`/`CardStatusChip`): skipped, added. Status only, never counts. */
  chips?: ReactNode;
  showMedia?: boolean;
  interaction: CardHeaderInteraction;
  /** Standalone controls: info button, drag handle. Bottom-right; each keeps its own 44px target. */
  trailing?: ReactNode;
  tone?: CardTone;
  headingLevel?: CardHeadingLevel;
  /** Expanded content (editor). Rendered inside the surface under the header. */
  panel?: ReactNode;
  panelProps?: { id: string; "data-testid"?: string; hidden?: boolean };
  /** Attached action strip (`CardActionFrame`): last child of the surface, outside any panel. */
  footer?: ReactNode;
  /** Keep the header pinned while the panel is open (day editor). */
  stickyHeader?: boolean;
  /** Let panel content escape the rounded clip (session set logger popovers). Implied by `stickyHeader` while open. */
  allowOverflow?: boolean;
  /** Inline status on the title line, after the name (live workout: the Skipped / Added chip). Off by default. */
  titleAccessory?: ReactNode;
  /** Show the header chevron (default true). The live workout card hides it: the card itself is the expand target. */
  showAffordance?: boolean;
  className?: string;
}) {
  const showNoTarget = targetValues.length === 0 && Boolean(noTargetLabel);
  const details = targetValues.length > 0 || showNoTarget || progress ? (
    <div className="grid gap-2">
      {showNoTarget ? (
        <p data-exercise-no-target="true" className="m-0 text-[12px] font-medium leading-tight text-[rgb(var(--text-muted)/0.98)]">{noTargetLabel}</p>
      ) : (
        <ExerciseGoalLine values={targetValues} />
      )}
      {progress ? <ExerciseProgressBar progress={progress} exerciseName={exercise.name} /> : null}
    </div>
  ) : undefined;

  const hasSideColumn = showMedia || Boolean(trailing);
  // Side column: decorative thumbnail on top, controls at the bottom. The column itself lets taps fall through to
  // the stretched header button; only the controls take pointer events.
  const sideColumn = hasSideColumn ? (
    <>
      {showMedia ? (
        <span data-exercise-thumb-slot="true" className="block">
          <ExerciseThumb
            exercise={exercise}
            size={EXERCISE_ROW_THUMB_SIZE}
            intent="row-card"
            layout="inline"
            sizes={`${EXERCISE_ROW_THUMB_SIZE}px`}
          />
        </span>
      ) : <span aria-hidden="true" />}
      {trailing ? (
        <span data-exercise-controls="true" className="pointer-events-auto flex items-center gap-0.5">{trailing}</span>
      ) : null}
    </>
  ) : undefined;

  const header = (
    <CardHeader
      headingLevel={headingLevel}
      title={titleAccessory ? (
        <span data-exercise-title-line="true" className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0">{exercise.name}</span>
          {completed ? <ExerciseDoneCheck /> : null}
          {titleAccessory}
        </span>
      ) : completed ? <>{exercise.name}<ExerciseDoneCheck /></> : exercise.name}
      meta={metaItems.length > 0 ? <CardMeta items={metaItems} /> : undefined}
      chips={chips}
      details={details}
      mainClassName="self-start"
      trailing={sideColumn}
      trailingClassName="pointer-events-none flex-col self-stretch !items-end justify-between gap-2 py-2"
      interaction={interaction}
      showAffordance={showAffordance}
    />
  );

  return (
    <CardSurface
      tone={tone}
      allowOverflow={allowOverflow || (stickyHeader && interaction.kind === "toggle" && interaction.expanded)}
      className={className}
      data-exercise-row-card="true"
    >
      {stickyHeader && interaction.kind === "toggle" && interaction.expanded ? (
        <div className="sticky top-0 z-20 [background:linear-gradient(180deg,rgb(var(--bg-app)/0.98)_0%,rgb(var(--bg-app)/0.92)_78%,rgb(var(--bg-app)/0)_100%)] backdrop-blur-[8px]">
          {header}
        </div>
      ) : header}
      {panel ? (
        <div
          {...panelProps}
          className={cn("border-t border-[rgb(var(--border-strong)/0.14)] px-3 pb-3 pt-2 sm:px-3.5", panelProps?.hidden ? "hidden" : undefined)}
        >
          {panel}
        </div>
      ) : null}
      {footer}
    </CardSurface>
  );
}
