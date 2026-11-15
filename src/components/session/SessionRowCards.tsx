"use client";

import type { ReactNode } from "react";
import {
  CardActionFrame,
  CardChip,
  CardChips,
  CardInfoButton,
  CardMeta,
  CardStatusChip,
  CardSurface,
  cardTokens,
  getCardActionButtonClassName,
  type CardActionIntent,
  type CardTone,
} from "@/components/ui/card-system";
import {
  ExerciseRowCard,
  type ExerciseRowCardProgress,
  type ExerciseRowCardVisual,
} from "@/components/workout/ExerciseRowCard";
import { getDurationWholeMinutes } from "@/lib/duration";
import { formatDurationShort } from "@/lib/formatting";
import { buildExerciseDisclosureContract } from "@/lib/exercise-disclosure";
import { cn } from "@/lib/cn";

/**
 * Current-session cards (docs/design-system/CARD-SYSTEM.md section 7.4). Presentation only: every handler,
 * data attribute and test id the session screen pins is passed in by `SessionExerciseFocus`; nothing here logs a
 * set, queues, syncs or reads the clock.
 */

export type SessionStatusChip = "done" | "skipped" | "added" | null;

function SessionStatusChips({ status }: { status: SessionStatusChip }) {
  if (status === null) {
    return null;
  }

  return (
    <CardChips>
      {status === "added" ? <CardChip tone="neutral">Added</CardChip> : <CardStatusChip status={status} />}
    </CardChips>
  );
}

/**
 * Exercise row in the session list: the shared `ExerciseRowCard` with a toggle header (expands the set logger),
 * a 44px info control, the logger as the panel, and, while collapsed, an attached footer (feedback, rest note,
 * quick-log row). The toggle keeps `session-exercise-toggle-<id>` / `session-exercise-panel-<id>` ids.
 */
export function SessionExerciseRowCard({
  itemId,
  exercise,
  expanded,
  onToggle,
  metaItems,
  targetValues,
  progressionLabel,
  progress,
  status,
  tone,
  showMedia,
  infoLabel,
  onOpenInfo,
  panel,
  footer,
}: {
  itemId: string;
  exercise: ExerciseRowCardVisual;
  expanded: boolean;
  onToggle: () => void;
  metaItems: string[];
  targetValues: string[];
  progressionLabel?: string | null;
  progress?: ExerciseRowCardProgress | null;
  status: SessionStatusChip;
  tone: CardTone;
  showMedia: boolean;
  infoLabel: string;
  onOpenInfo: () => void;
  panel?: ReactNode;
  footer?: ReactNode;
}) {
  const contract = buildExerciseDisclosureContract({ itemId, scope: "session-exercise" });

  return (
    <ExerciseRowCard
      exercise={exercise}
      metaItems={metaItems}
      targetValues={targetValues}
      progressionLabel={progressionLabel}
      progress={progress}
      chips={<SessionStatusChips status={status} />}
      showMedia={showMedia}
      tone={tone}
      interaction={{
        kind: "toggle",
        expanded,
        onToggle,
        controlsId: contract.panelId,
        buttonProps: { "data-testid": contract.buttonTestId },
      }}
      trailing={<CardInfoButton label={infoLabel} onClick={onOpenInfo} />}
      panel={expanded ? panel : undefined}
      panelProps={{ id: contract.panelId, "data-testid": contract.panelTestId }}
      footer={expanded ? undefined : footer}
      allowOverflow
    />
  );
}

/** Compact card for a skipped (or finished and hidden) exercise: name, status chip, logged progress, one 44px action. */
export function SessionHiddenRowCard({
  exercise,
  status,
  progress,
  action,
}: {
  exercise: ExerciseRowCardVisual;
  status: Exclude<SessionStatusChip, "added" | null>;
  progress: ExerciseRowCardProgress | null;
  action: ReactNode;
}) {
  return (
    <ExerciseRowCard
      exercise={exercise}
      metaItems={[]}
      targetValues={[]}
      progress={progress}
      chips={<SessionStatusChips status={status} />}
      showMedia={false}
      tone={status === "skipped" ? "attention" : "completed"}
      interaction={{ kind: "none" }}
      footer={(
        <CardActionFrame columns={1} label={`${exercise.name} actions`}>
          {action}
        </CardActionFrame>
      )}
    />
  );
}

type RowActionButtonProps = {
  intent: CardActionIntent;
  label: ReactNode;
  /** Plain-text name; it must contain the visible label text. */
  ariaLabel?: string;
  onPress: () => void;
  /** `aria-disabled`, not `disabled`: a pending save keeps keyboard focus on the button it came from. The caller guards the handler too. */
  inactive: boolean;
  divider?: boolean;
  intentAttr?: string;
};

/** One 44px action in a session card footer. Inactive is aria-disabled, so a tap during a save never drops focus. */
export function SessionRowActionButton({ intent, label, ariaLabel, onPress, inactive, divider = false, intentAttr }: RowActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-disabled={inactive || undefined}
      data-bottom-action-intent={intentAttr}
      onClick={() => {
        if (inactive) {
          return;
        }
        onPress();
      }}
      className={cn(
        getCardActionButtonClassName({ intent, divider }),
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
      )}
    >
      <span className="bottom-action__label min-w-0">{label}</span>
    </button>
  );
}

function QuickLogLabel({ label }: { label: string }) {
  const detailStart = label.indexOf(": ");
  if (detailStart < 1) {
    return <>{label}</>;
  }

  const prefix = label.slice(0, detailStart);
  const details = label
    .slice(detailStart + 2)
    .split(/\s*\|\s*/)
    .filter(Boolean);

  if (details.length === 0) {
    return <>{prefix}</>;
  }

  return (
    <span className="flex min-w-0 flex-col items-center gap-0.5 text-[11px] leading-tight">
      <span>{prefix}</span>
      <span className="min-w-0 text-center font-medium tracking-normal">{details.join(" · ")}</span>
    </span>
  );
}

/**
 * Collapsed-row action strip: Skip (or Unskip / Hide), optional Log all, and the one-tap Log set that carries the
 * target preview. Same three actions and order as the old attached strip; 44px tall, 11px text. Handlers are the
 * session screen's own (`onSkip`, `onPress`); this component only calls them.
 */
export function SessionQuickLogRow({
  rowContract,
  logAllCount,
  onSkip,
  onPress,
  exerciseName,
}: {
  rowContract: {
    label: string;
    skipLabel: string;
    skipActionIntent?: "danger" | "info" | "positive" | "toggleInactive" | "toggleActive";
    isSkipPending: boolean;
    isQuickLogPending: boolean;
    isQuickLogDisabled: boolean;
    isSkipDisabled: boolean;
    quickLogDisabledMessage: string;
  };
  logAllCount: number;
  onSkip: () => Promise<void> | void;
  onPress: () => Promise<void> | void;
  exerciseName: string;
}) {
  const isBusy = rowContract.isSkipPending || rowContract.isQuickLogPending;
  const skipInactive = isBusy || rowContract.isSkipDisabled;
  const logInactive = isBusy || rowContract.isQuickLogDisabled;
  const showLogAll = logAllCount > 0;
  const quickLogLabel = rowContract.isQuickLogDisabled
    ? rowContract.quickLogDisabledMessage
    : rowContract.isQuickLogPending
      ? "Adding..."
      : rowContract.label;
  const skipLabel = rowContract.isSkipPending ? "Saving..." : rowContract.skipLabel;
  const handleLogAll = async () => {
    for (let index = 0; index < logAllCount; index += 1) {
      await onPress();
    }
  };

  // Polite live region, always mounted so the change is announced: a pending save is otherwise only a changed label.
  const pendingAnnouncement = rowContract.isQuickLogPending
    ? `Adding set to ${exerciseName}`
    : rowContract.isSkipPending
      ? `Saving ${exerciseName}`
      : "";

  return (
    <>
      <span role="status" aria-live="polite" className="sr-only">{pendingAnnouncement}</span>
      <CardActionFrame
      columns={showLogAll ? 3 : 2}
      label={`Quick actions for ${exerciseName}`}
      gridClassName={showLogAll ? "grid-cols-[4.75rem_5rem_minmax(0,1fr)]" : "grid-cols-[4.75rem_minmax(0,1fr)]"}
    >
      <SessionRowActionButton
        intent={rowContract.skipActionIntent === "toggleActive" ? "toggle" : "neutral"}
        intentAttr={rowContract.skipActionIntent}
        label={skipLabel}
        ariaLabel={`${skipLabel}: ${exerciseName}`}
        inactive={skipInactive}
        divider
        onPress={() => { void onSkip(); }}
      />
      {showLogAll ? (
        <SessionRowActionButton
          intent="primary"
          intentAttr="positive"
          label="Log all"
          ariaLabel={`Log all remaining sets: ${exerciseName}`}
          inactive={logInactive}
          divider
          onPress={() => { void handleLogAll(); }}
        />
      ) : null}
      <SessionRowActionButton
        intent="primary"
        intentAttr="positive"
        label={<QuickLogLabel label={quickLogLabel} />}
        inactive={logInactive}
        onPress={() => { void onPress(); }}
      />
      </CardActionFrame>
    </>
  );
}

/** One quiet line under the header: observed rest and the saved feedback label (both plain text, 12px). */
export function SessionRowNote({ children }: { children: ReactNode }) {
  return (
    <p data-session-row-note="true" className="m-0 border-t border-[rgb(var(--accent-divider-rgb)/0.18)] px-4 py-2 text-xs font-medium leading-snug text-[rgb(var(--text-secondary)/0.95)]">
      {children}
    </p>
  );
}

/** What the finished card counts per exercise. `SessionExerciseFocus` keeps a live copy (set snapshots, including queued sets) in a ref. */
export type SessionFinishedExercise = { loggedSetCount: number; isSkipped: boolean };

/** Facts for the finished-session card: exercises worked, sets logged, duration through the History formatter (whole minutes, floored; 75 min reads "1h 15m"). */
export function buildSessionFinishedFacts(args: {
  exercises: SessionFinishedExercise[];
  durationSeconds: number;
}): string[] {
  const worked = args.exercises.filter((exercise) => !exercise.isSkipped && exercise.loggedSetCount > 0).length;
  const sets = args.exercises.reduce((total, exercise) => total + (exercise.isSkipped ? 0 : Math.max(0, exercise.loggedSetCount)), 0);
  const facts: string[] = [];
  if (worked > 0) {
    facts.push(`${worked} ${worked === 1 ? "exercise" : "exercises"}`);
  }
  if (sets > 0) {
    facts.push(`${sets} ${sets === 1 ? "set" : "sets"}`);
  }
  const minutes = getDurationWholeMinutes(args.durationSeconds);
  if (minutes >= 1) {
    facts.push(formatDurationShort(minutes * 60) ?? `${minutes}m`);
  }

  return facts;
}

/** Finish screen: a completed card with what was done, then the existing "Continue" hint. The Continue action stays in the dock. */
export function SessionFinishedCard({ facts }: { facts: string[] }) {
  return (
    <CardSurface tone="completed" role="status" data-session-finished="true">
      <div className="grid gap-1 px-4 py-4 pl-5">
        <h2 className={cardTokens.title}>Workout saved</h2>
        {facts.length > 0 ? <CardMeta items={facts} flush /> : null}
        <p className="m-0 text-sm leading-snug text-[rgb(var(--text-secondary)/0.95)]">Continue to return to your workout overview.</p>
        <CardChips><CardStatusChip status="done" /></CardChips>
      </div>
    </CardSurface>
  );
}
