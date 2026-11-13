"use client";

import type { ReactNode } from "react";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import {
  CardHeader,
  CardMeta,
  CardSurface,
  StatBlock,
  type CardHeaderInteraction,
  type CardHeadingLevel,
  type CardTone,
} from "@/components/ui/card-system";
import { cn } from "@/lib/cn";
import type { ExerciseThumbSourceKind } from "@/lib/exerciseImages";

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

export type ExerciseRowCardProgress = {
  /** Plain-text progress, for example `2 / 4 sets`. The bar is decorative; this text carries the meaning. */
  label: string;
  /** 0-100, or null when there is no bar to draw (text only). */
  percent: number | null;
  /** `complete` uses the success colour for the bar; the label still says what is complete. */
  tone?: "default" | "complete";
};

function ExerciseRowProgress({ progress }: { progress: ExerciseRowCardProgress }) {
  const percent = progress.percent === null ? null : Math.max(0, Math.min(100, Math.round(progress.percent)));

  return (
    <div data-exercise-row-progress="true" className="grid gap-1">
      <p className="m-0 text-xs font-semibold leading-snug tabular-nums text-[rgb(var(--text-secondary)/0.98)]">{progress.label}</p>
      {percent !== null ? (
        <span aria-hidden="true" className="block h-1 w-full overflow-hidden rounded-full bg-[rgb(var(--surface-3-rgb)/0.7)]">
          <span
            className={cn(
              "block h-full rounded-full",
              progress.tone === "complete" ? "bg-[rgb(var(--success-rgb)/0.96)]" : "bg-[rgb(var(--accent)/0.8)]",
            )}
            style={{ width: `${percent}%` }}
          />
        </span>
      ) : null}
    </div>
  );
}

/**
 * Exercise card (planned exercise on the day editor; later the session and history rows).
 *
 *   [thumb]  Exercise name                               [info] [handle] [chevron]
 *            Quads · Squat
 *            TARGET
 *            4 sets · 5 reps · 225 lbs
 *            AUTO · SESSION · SET
 *   (expanded) editor panel
 *
 * Same header anatomy as routine and day cards (CardHeader); media is a 56px rounded thumbnail instead of a
 * full-height rail. Info and drag handle are separate 44px controls in the trailing slot.
 */
export function ExerciseRowCard({
  exercise,
  metaItems,
  targetLabel = "Target",
  targetValues,
  progressionLabel,
  progress,
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
  className,
}: {
  exercise: ExerciseRowCardVisual;
  metaItems: string[];
  targetLabel?: string;
  targetValues: string[];
  /** Progression state, for example "AUTO - SESSION - SET". Rendered as quiet meta, never as a colour-only cue. */
  progressionLabel?: string | null;
  /** Logged-set or progression progress: a text label with an optional decorative bar. */
  progress?: ExerciseRowCardProgress | null;
  /** Status chips (`CardChips` with `CardStatusChip`): done, skipped. Status only, never counts. */
  chips?: ReactNode;
  showMedia?: boolean;
  interaction: CardHeaderInteraction;
  /** Standalone controls: info button, drag handle. Each keeps its own 44px target. */
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
  className?: string;
}) {
  const details = targetValues.length > 0 || progressionLabel || progress ? (
    <div className="grid gap-1.5">
      <StatBlock label={targetLabel} values={targetValues} />
      {progressionLabel ? (
        <p className="m-0 text-[11px] font-semibold uppercase leading-tight tracking-[0.1em] text-[rgb(var(--text-muted)/0.98)]">{progressionLabel}</p>
      ) : null}
      {progress ? <ExerciseRowProgress progress={progress} /> : null}
    </div>
  ) : undefined;

  const header = (
    <CardHeader
      headingLevel={headingLevel}
      title={exercise.name}
      meta={metaItems.length > 0 ? <CardMeta items={metaItems} /> : undefined}
      chips={chips}
      details={details}
      leading={showMedia ? (
        <ExerciseThumb
          exercise={exercise}
          size={EXERCISE_ROW_THUMB_SIZE}
          intent="row-card"
          layout="inline"
          sizes={`${EXERCISE_ROW_THUMB_SIZE}px`}
        />
      ) : undefined}
      trailing={trailing}
      trailingClassName="flex-col"
      interaction={interaction}
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
        <div className="sticky top-0 z-20 [background:linear-gradient(180deg,rgba(var(--bg-app),0.98)_0%,rgba(var(--bg-app),0.92)_78%,rgba(var(--bg-app),0)_100%)] backdrop-blur-[8px]">
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
