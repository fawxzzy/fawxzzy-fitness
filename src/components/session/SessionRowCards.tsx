"use client";

import { useState, type ReactNode } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import {
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

/**
 * Inline status on the title line, after the name: Skipped keeps its glyph chip, Added is a quiet chip. A finished row
 * has no chip and no check: the full green bar and the completed tone already say it (Zac 2026-11-23).
 */
function SessionTitleStatus({ status }: { status: SessionStatusChip }) {
  if (status === null || status === "done") {
    return null;
  }

  return status === "added"
    ? <CardChip tone="neutral" className="shrink-0">Added</CardChip>
    : <CardStatusChip status={status} className="shrink-0" />;
}

/**
 * Exercise row in the session list: the shared `ExerciseRowCard` with a toggle header (expands the set logger; no
 * chevron, the whole header is the target), the status inline with the name, a 44px info control under the
 * thumbnail, the logger as the panel, and, while collapsed, the footer (feedback, rest note, action bar). The toggle
 * keeps `session-exercise-toggle-<id>` / `session-exercise-panel-<id>` ids.
 */
export function SessionExerciseRowCard({
  itemId,
  exercise,
  expanded,
  onToggle,
  metaItems,
  targetValues,
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
      progress={progress}
      titleAccessory={status === "skipped" || status === "added" ? <SessionTitleStatus status={status} /> : undefined}
      showMedia={showMedia}
      showAffordance={false}
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

/**
 * Compact card for a skipped (or finished and hidden) exercise: the name with the status inline, the thumbnail top
 * right (same place as the full card), logged progress, and the action bar with the one restore action.
 */
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
      titleAccessory={status === "skipped" ? <SessionTitleStatus status={status} /> : undefined}
      showMedia
      showAffordance={false}
      tone={status === "skipped" ? "attention" : "completed"}
      interaction={{ kind: "none" }}
      footer={<SessionCardActionBar label={`${exercise.name} actions`}>{action}</SessionCardActionBar>}
    />
  );
}

/**
 * The card's bottom bar (Zac 2026-11-23: every card action lives here). Padded pills inside the card instead of the
 * old edge-to-edge strip; each control is a real 44px target. Order: More (menu), secondary, then the one primary.
 */
export function SessionCardActionBar({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div
      data-card-actions="true"
      data-session-card-bar="true"
      role="group"
      aria-label={label}
      className={cn("flex min-w-0 items-center gap-2 px-3 pb-3 pt-1", className)}
    >
      {children}
    </div>
  );
}

export type SessionCardBarButtonVariant = "quiet" | "primary" | "icon";

const SESSION_CARD_BAR_BUTTON_BASE =
  "inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full !border text-[13px] font-semibold leading-none shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-55 aria-disabled:active:scale-100";

const SESSION_CARD_BAR_BUTTON_VARIANTS: Record<SessionCardBarButtonVariant, string> = {
  quiet: "px-4 !border-[rgb(var(--border-strong)/0.26)] !bg-[rgb(var(--surface-2)/0.45)] !text-[rgb(var(--text-primary))] hover:!bg-[rgb(var(--surface-2)/0.7)] focus-visible:ring-[rgb(var(--accent)/0.45)]",
  icon: "w-11 px-0 !border-[rgb(var(--border-strong)/0.26)] !bg-[rgb(var(--surface-2)/0.45)] !text-[rgb(var(--text-secondary))] hover:!bg-[rgb(var(--surface-2)/0.7)] focus-visible:ring-[rgb(var(--accent)/0.45)]",
  primary: "min-w-0 flex-1 shrink px-4 !border-[rgb(var(--success-rgb)/0.6)] !bg-[rgb(var(--success-rgb)/0.2)] !text-[rgb(var(--text-primary))] shadow-[0_0_14px_rgb(var(--success-rgb)/0.18)] hover:!bg-[rgb(var(--success-rgb)/0.28)] focus-visible:ring-[rgb(var(--accent)/0.6)]",
};

export function getSessionCardBarButtonClassName(variant: SessionCardBarButtonVariant, className?: string) {
  return cn(SESSION_CARD_BAR_BUTTON_BASE, SESSION_CARD_BAR_BUTTON_VARIANTS[variant], className);
}

/** One bar control. Inactive is aria-disabled (never native disabled): a pending save keeps focus where it was. */
export function SessionCardBarButton({
  variant,
  label,
  ariaLabel,
  onPress,
  inactive = false,
  intentAttr,
  className,
  buttonProps,
}: {
  variant: SessionCardBarButtonVariant;
  label: ReactNode;
  /** Plain-text name; it must contain the visible label text (label in name). */
  ariaLabel?: string;
  onPress: () => void;
  inactive?: boolean;
  intentAttr?: string;
  className?: string;
  buttonProps?: Record<string, string | undefined>;
}) {
  return (
    <button
      type="button"
      {...buttonProps}
      aria-label={ariaLabel}
      aria-disabled={inactive || undefined}
      data-bottom-action-intent={intentAttr}
      onClick={() => {
        if (inactive) {
          return;
        }
        onPress();
      }}
      className={getSessionCardBarButtonClassName(variant, className)}
    >
      {label}
    </button>
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

/** One 44px action in an attached card strip (kept for strip callers). Inactive is aria-disabled, so a tap during a save never drops focus. */
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

/** "Log: 5 reps | 225 lbs" -> "Log set" over "5 reps · 225 lbs". Plain labels ("Adding...") pass through. */
function QuickLogLabel({ label }: { label: string }) {
  const detailStart = label.indexOf(": ");
  if (detailStart < 1) {
    return <span className="truncate">{label}</span>;
  }

  const rawPrefix = label.slice(0, detailStart);
  const prefix = rawPrefix === "Log" ? "Log set" : rawPrefix;
  const details = label
    .slice(detailStart + 2)
    .split(/\s*\|\s*/)
    .filter(Boolean);

  if (details.length === 0) {
    return <span className="truncate">{prefix}</span>;
  }

  return (
    <span className="flex min-w-0 max-w-full flex-col items-center gap-0.5 leading-tight">
      <span className="text-[13px] font-bold">{prefix}</span>
      <span className="max-w-full truncate text-[11px] font-medium tracking-normal text-[rgb(var(--text-secondary))]">{details.join(" · ")}</span>
    </span>
  );
}

/** Menu wording for the row's skip/hide action ("Skip" -> "Skip exercise"). */
export function getSessionSkipMenuLabel(skipLabel: string) {
  return `${skipLabel} exercise`;
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
      <circle cx="4.5" cy="10" r="1.6" />
      <circle cx="10" cy="10" r="1.6" />
      <circle cx="15.5" cy="10" r="1.6" />
    </svg>
  );
}

const SESSION_MENU_ITEM_CLASS_NAME =
  "flex min-h-12 w-full items-center justify-between gap-3 rounded-[0.9rem] !border !border-[rgb(var(--border-strong)/0.2)] !bg-[rgb(var(--surface-2)/0.45)] px-4 text-left text-[15px] font-semibold !text-[rgb(var(--text-primary))] shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.45)] aria-disabled:cursor-not-allowed aria-disabled:opacity-55";

/**
 * The card's More control: a 44px icon button that opens a sheet with Skip/Hide and (optionally) Remove. Used by the
 * collapsed bar and by the expanded logger, so every card action lives in the card's own bar. Remove always asks first
 * (ConfirmDestructiveModal); nothing here shows a success notice. Handlers are the session screen's own.
 */
export function SessionCardMoreMenu({
  exerciseName,
  skipLabel,
  skipActionIntent,
  isSkipPending,
  skipInactive,
  removeInactive,
  onSkip,
  onRemove,
}: {
  exerciseName: string;
  skipLabel: string;
  skipActionIntent?: "danger" | "info" | "positive" | "toggleInactive" | "toggleActive";
  isSkipPending: boolean;
  skipInactive: boolean;
  removeInactive: boolean;
  onSkip: () => Promise<void> | void;
  /** Removes the exercise from this workout (after the confirm). Omitted: the menu has no Remove. */
  onRemove?: () => Promise<void> | void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const skipNameLabel = isSkipPending ? "Saving..." : skipLabel;
  const skipMenuLabel = isSkipPending ? "Saving..." : getSessionSkipMenuLabel(skipLabel);

  return (
    <>
      <SessionCardBarButton
        variant="icon"
        label={<MoreIcon />}
        ariaLabel={`More actions for ${exerciseName}`}
        buttonProps={{ "aria-haspopup": "dialog", "aria-expanded": menuOpen ? "true" : "false", "data-session-more": "true" }}
        onPress={() => setMenuOpen(true)}
      />
      <BottomSheet open={menuOpen} title={exerciseName} eyebrow={null} onClose={() => setMenuOpen(false)}>
        <div className="grid gap-2 pb-1" role="group" aria-label={`Actions for ${exerciseName}`}>
          <button
            type="button"
            aria-label={`${skipNameLabel}: ${exerciseName}`}
            aria-disabled={skipInactive || undefined}
            data-bottom-action-intent={skipActionIntent}
            data-session-skip="true"
            className={SESSION_MENU_ITEM_CLASS_NAME}
            onClick={() => {
              if (skipInactive) {
                return;
              }
              setMenuOpen(false);
              void onSkip();
            }}
          >
            <span>{skipMenuLabel}</span>
          </button>
          {onRemove ? (
            <button
              type="button"
              data-bottom-action-intent="danger"
              data-session-remove="true"
              aria-disabled={removeInactive || undefined}
              className={cn(SESSION_MENU_ITEM_CLASS_NAME, "!text-[rgb(var(--danger-rgb))]")}
              onClick={() => {
                if (removeInactive) {
                  return;
                }
                setMenuOpen(false);
                setConfirmRemoveOpen(true);
              }}
            >
              <span>Remove from workout</span>
            </button>
          ) : null}
        </div>
      </BottomSheet>
      {onRemove ? (
        <ConfirmDestructiveModal
          open={confirmRemoveOpen}
          titleVariant="raw"
          title={`Remove ${exerciseName}?`}
          consequenceText="It leaves this workout. You can add it back with Add."
          confirmLabel="Remove"
          confirmActionLabel="Remove"
          cancelLabel="Keep"
          onCancel={() => setConfirmRemoveOpen(false)}
          onConfirm={() => {
            setConfirmRemoveOpen(false);
            void onRemove();
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Collapsed-row action bar: More (SessionCardMoreMenu), optional Log all, and the one-tap Log set that carries the
 * target preview. Handlers are the session screen's own (`onSkip`, `onPress`, `onRemove`); this component only calls
 * them, and shows no success notice.
 */
export function SessionQuickLogRow({
  rowContract,
  logAllCount,
  onSkip,
  onPress,
  onRemove,
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
  /** Removes the exercise from this workout (after the confirm). Omitted: the menu has no Remove. */
  onRemove?: () => Promise<void> | void;
  exerciseName: string;
}) {
  const isBusy = rowContract.isSkipPending || rowContract.isQuickLogPending;
  const logInactive = isBusy || rowContract.isQuickLogDisabled;
  const showLogAll = logAllCount > 1;
  const quickLogLabel = rowContract.isQuickLogDisabled
    ? rowContract.quickLogDisabledMessage
    : rowContract.isQuickLogPending
      ? "Adding..."
      : rowContract.label;
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
      <SessionCardActionBar label={`Quick actions for ${exerciseName}`}>
        <SessionCardMoreMenu
          exerciseName={exerciseName}
          skipLabel={rowContract.skipLabel}
          skipActionIntent={rowContract.skipActionIntent}
          isSkipPending={rowContract.isSkipPending}
          skipInactive={isBusy || rowContract.isSkipDisabled}
          removeInactive={isBusy}
          onSkip={onSkip}
          onRemove={onRemove}
        />
        {showLogAll ? (
          <SessionCardBarButton
            variant="quiet"
            intentAttr="positive"
            label="Log all"
            ariaLabel={`Log all remaining sets: ${exerciseName}`}
            inactive={logInactive}
            onPress={() => { void handleLogAll(); }}
          />
        ) : null}
        <SessionCardBarButton
          variant="primary"
          intentAttr="positive"
          label={<QuickLogLabel label={quickLogLabel} />}
          inactive={logInactive}
          onPress={() => { void onPress(); }}
        />
      </SessionCardActionBar>
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
