"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "@/components/ui/Menu";
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
import { buildSessionSummaryDetails, type SessionSummaryDetails, type SessionSummarySet } from "@/components/session/sessionSummary";

/**
 * Current-session cards (docs/design-system/CARD-SYSTEM.md section 7.4). Presentation only: every handler,
 * data attribute and test id the session screen pins is passed in by `SessionExerciseFocus`; nothing here logs a
 * set, queues, syncs or reads the clock.
 */

/** "partial" = skipped after at least one set was logged (DESIGN: a 1/3 Plank reads Partial, never SKIPPED). */
export type SessionStatusChip = "done" | "skipped" | "partial" | "added" | null;

/** Skipped with sets logged is partial, not skipped; the summary (sessionSummary.ts) uses the same rule. */
export function resolveSessionSkippedStatus(loggedSetCount: number): "skipped" | "partial" {
  return loggedSetCount > 0 ? "partial" : "skipped";
}

/**
 * Inline status on the title line, after the name: Skipped keeps its glyph chip, Added is a quiet chip. A finished row
 * has no chip and no check: the full green bar and the completed tone already say it (Zac 2026-11-23).
 */
function SessionTitleStatus({ status }: { status: SessionStatusChip }) {
  if (status === null || status === "done") {
    return null;
  }

  if (status === "added") {
    return <CardChip tone="neutral" className="shrink-0">Added</CardChip>;
  }
  if (status === "partial") {
    return <CardChip tone="attention" className="shrink-0">Partial</CardChip>;
  }
  return <CardStatusChip status={status} className="shrink-0" />;
}

/**
 * Exercise row in the session list: the shared `ExerciseRowCard` with a toggle header (expands the set logger; no
 * chevron, the whole header is the target), the status inline with the name, a 44px info control under the
 * thumbnail, the logger as the panel, and, while collapsed, the footer (feedback, rest note, action bar). The toggle
 * keeps `session-exercise-toggle-<id>` / `session-exercise-panel-<id>` ids.
 *
 * Open / close works two ways (Zac 2026-11-24; the separate Close text control was dropped in wave 2, 2026-11-26),
 * both calling the same `onToggle`: the header, and a thin grab handle centred on the card's bottom edge (a shallow V
 * that flips to point up while open). Still no chevron or check on the card. Only one card is open at a time (the
 * session keeps one selected exercise), and logging the last planned set moves on to the next exercise by itself.
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
  const openPanel = expanded && panel ? panel : undefined;
  const expandHandle = (
    <SessionCardExpandHandle
      expanded={expanded}
      controlsId={contract.panelId}
      exerciseName={exercise.name}
      onToggle={onToggle}
    />
  );

  return (
    <ExerciseRowCard
      exercise={exercise}
      metaItems={metaItems}
      targetValues={targetValues}
      progress={progress}
      titleAccessory={status === "skipped" || status === "partial" || status === "added" ? <SessionTitleStatus status={status} /> : undefined}
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
      panel={openPanel}
      panelProps={{ id: contract.panelId, "data-testid": contract.panelTestId }}
      footer={(
        <>
          {expanded ? null : footer}
          {expandHandle}
        </>
      )}
      allowOverflow
    />
  );
}

/**
 * The grab handle on a session card's bottom edge: a thin pill bent into a shallow V that points down while the card
 * is closed and flips to point up while it is open. Same toggle as the header; aria-expanded mirrors it. The visible
 * pill is small; the target is 64px wide and 44px tall, grown downward from 4px above the pill (the row sits 4px
 * under the action bar) so it never takes a tap from Log set / Log all above it (`SESSION_HANDLE_HIT_AREA`).
 * The row's 16px bottom padding keeps the target inside the card except its last 3px, which sit in the empty 8px gap,
 * so the next card (relative isolate, later in the DOM) never covers it: 44px measured at 390 and 320 wide. With 4px
 * padding the next card took the bottom 8px and the real target was 36px (elementFromPoint, 2026-11-24 review).
 *
 * Name: "Open X logger" while closed, "Collapse X logger" while open.
 */
// 44px tall target that starts 4px above the pill (the bar's bottom edge) and grows down, not centred like HIT_AREA.
const SESSION_HANDLE_HIT_AREA = "relative before:absolute before:inset-x-0 before:-top-1 before:h-11 before:content-['']";

export function SessionCardExpandHandle({
  expanded,
  controlsId,
  exerciseName,
  onToggle,
}: {
  expanded: boolean;
  controlsId: string;
  exerciseName: string;
  onToggle: () => void;
}) {
  return (
    <div data-session-expand-handle-row="true" className="mt-1 flex justify-center pb-4">
      <button
        type="button"
        data-session-expand-handle="true"
        aria-expanded={expanded}
        aria-controls={controlsId}
        aria-label={expanded ? `Collapse ${exerciseName} logger` : `Open ${exerciseName} logger`}
        onClick={onToggle}
        className={cn(
          SESSION_HANDLE_HIT_AREA,
          "inline-flex h-5 w-16 items-center justify-center rounded-full !border-0 !bg-transparent !shadow-none text-[rgb(var(--text-muted)/0.9)] transition-colors hover:text-[rgb(var(--text-secondary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.5)]",
        )}
      >
        <svg
          viewBox="0 0 32 10"
          aria-hidden="true"
          data-session-expand-handle-direction={expanded ? "up" : "down"}
          className={cn("h-2.5 w-8 transition-transform duration-200 motion-reduce:transition-none", expanded ? "rotate-180" : "")}
        >
          <path d="M3 3 16 7 29 3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        </svg>
      </button>
    </div>
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
      titleAccessory={status === "skipped" || status === "partial" ? <SessionTitleStatus status={status} /> : undefined}
      showMedia
      showAffordance={false}
      tone={status === "skipped" || status === "partial" ? "attention" : "completed"}
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

/**
 * The card's More control: the shared Menu (components/ui/Menu.tsx, FOUNDATION "Menu"), a 44px trigger that opens a
 * small popover with (optionally) Show / Hide timer, Skip/Hide and (optionally) Remove. Used by the
 * collapsed bar and by the expanded logger, so every card action lives in the card's own bar. Remove always asks first
 * (ConfirmDestructiveModal); nothing here shows a success notice. Handlers are the session screen's own.
 * Wave 2 (2026-11-26): the exercise timer toggle moved here from the open logger's chip row.
 */
export function SessionCardMoreMenu({
  exerciseName,
  skipLabel,
  isSkipPending,
  skipInactive,
  removeInactive,
  onSkip,
  onRemove,
  timerVisible = false,
  timerInactive = false,
  onToggleTimer,
}: {
  exerciseName: string;
  skipLabel: string;
  /** Kept for callers; menu rows have one neutral tone (Remove is the only danger row). */
  skipActionIntent?: "danger" | "info" | "positive" | "toggleInactive" | "toggleActive";
  isSkipPending: boolean;
  skipInactive: boolean;
  removeInactive: boolean;
  onSkip: () => Promise<void> | void;
  /** Removes the exercise from this workout (after the confirm). Omitted: the menu has no Remove. */
  onRemove?: () => Promise<void> | void;
  /** Whether this card's exercise timer is showing (labels the timer row Show / Hide). */
  timerVisible?: boolean;
  timerInactive?: boolean;
  /** Shows or hides this card's exercise timer. Omitted: the menu has no timer row. */
  onToggleTimer?: () => Promise<void> | void;
}) {
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const skipMenuLabel = isSkipPending ? "Saving..." : getSessionSkipMenuLabel(skipLabel);

  return (
    <>
      {/* data-session-more marks the trigger's wrapper so Skip/Unskip can hand focus back to it. */}
      <span className="inline-flex shrink-0" data-session-more="true">
        <Menu
          label={`More actions for ${exerciseName}`}
          triggerIcon={<MoreIcon />}
          triggerClassName={getSessionCardBarButtonClassName("icon")}
          minWidth={200}
          items={[
            ...(onToggleTimer
              ? [{
                id: "timer",
                label: timerVisible ? "Hide timer" : "Show timer",
                disabled: timerInactive,
                onSelect: () => {
                  if (!timerInactive) {
                    void onToggleTimer();
                  }
                },
              }]
              : []),
            {
              id: "skip",
              label: skipMenuLabel,
              disabled: skipInactive,
              onSelect: () => {
                if (!skipInactive) {
                  void onSkip();
                }
              },
            },
            ...(onRemove
              ? [{
                id: "remove",
                label: "Remove from workout",
                tone: "danger" as const,
                disabled: removeInactive,
                onSelect: () => {
                  if (!removeInactive) {
                    setConfirmRemoveOpen(true);
                  }
                },
              }]
              : []),
          ]}
        />
      </span>
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

/**
 * What the finished card counts per exercise. `SessionExerciseFocus` keeps a live copy (set snapshots, including queued
 * sets) in a ref. `name` and `sets` feed the summary details (volume, top set, per-exercise lines).
 */
export type SessionFinishedExercise = { loggedSetCount: number; isSkipped: boolean; name?: string; sets?: SessionSummarySet[] };

/** The summary details for the finished card from the live list (exercises without a name are left out of the lines). */
export function buildSessionFinishedDetails(exercises: readonly SessionFinishedExercise[]): SessionSummaryDetails {
  return buildSessionSummaryDetails(
    exercises.map((exercise) => ({
      name: exercise.name?.trim() || "Exercise",
      loggedSetCount: exercise.loggedSetCount,
      isSkipped: exercise.isSkipped,
      sets: exercise.sets ?? [],
    })),
  );
}

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

/**
 * Post-workout summary (DESIGN #1, 2026-11-26). Saving no longer jumps straight to Today: the screen stays here and
 * shows what was done (exercises, sets, duration), the volume and the top set when the work was weighted, and one line
 * per exercise. The dock carries "Done" (back to Today) and "View in History". No PR line: the session screen has no
 * previous bests to compare against.
 */
export function SessionFinishedCard({ facts, details }: { facts: string[]; details?: SessionSummaryDetails | null }) {
  const highlights = [
    details?.volumeLabel ? { id: "volume", label: "Volume", value: details.volumeLabel } : null,
    details?.topSet ? { id: "top-set", label: "Top set", value: `${details.topSet.display} · ${details.topSet.exerciseName}` } : null,
  ].filter((item): item is { id: string; label: string; value: string } => item !== null);
  const rows = details?.rows ?? [];

  return (
    <CardSurface tone="completed" role="status" data-session-finished="true">
      <div className="grid gap-2 px-4 py-4 pl-5">
        <div className="grid gap-1">
          <h2 className={cardTokens.title}>Workout saved</h2>
          {facts.length > 0 ? <CardMeta items={facts} flush /> : null}
        </div>
        {highlights.length > 0 ? (
          <dl data-session-summary-highlights="true" className="m-0 grid gap-1.5">
            {highlights.map((item) => (
              <div key={item.id} data-session-summary-highlight={item.id} className="flex min-w-0 items-baseline justify-between gap-3">
                <dt className="shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-secondary)/0.9)]">{item.label}</dt>
                <dd className="m-0 min-w-0 text-right text-sm font-semibold text-[rgb(var(--text-primary))] [overflow-wrap:anywhere]">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {rows.length > 0 ? (
          <ul data-session-summary-rows="true" className="m-0 grid list-none gap-1 border-t border-[rgb(var(--accent-divider-rgb)/0.18)] p-0 pt-2">
            {rows.map((row, index) => (
              <li key={`${row.name}-${index}`} data-session-summary-row={row.state} className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-[rgb(var(--text-primary))]">{row.name}</span>
                <span className={cn("shrink-0 text-xs font-semibold", row.state === "done" ? "text-[rgb(var(--text-secondary)/0.95)]" : "text-[rgb(var(--warning-rgb))]")}>{row.detail}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="m-0 text-sm leading-snug text-[rgb(var(--text-secondary)/0.95)]">Saved to History. Tap Done to go back to Today.</p>
        <CardChips><CardStatusChip status="done" /></CardChips>
      </div>
    </CardSurface>
  );
}
