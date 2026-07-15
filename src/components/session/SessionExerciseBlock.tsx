import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { SignatureInlineList, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { getBottomActionButtonClassName, type BottomActionIntent } from "@/components/layout/bottomActionIntents";
import { cn } from "@/lib/cn";

export function SessionExerciseBlock({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full pb-2", className)}>{children}</div>;
}

export function SessionExerciseCard({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

function QuickLogActionLabel({ label }: { label: string }) {
  const detailStart = label.indexOf(": ");
  if (detailStart < 1) {
    return label;
  }

  const prefix = label.slice(0, detailStart);
  const details = label
    .slice(detailStart + 2)
    .split(/\s*\|\s*/)
    .filter(Boolean);

  if (details.length === 0) {
    return prefix;
  }

  return (
    <span className="inline-flex min-w-0 items-center justify-center gap-1.5 text-[10px] leading-tight">
      <span>{prefix}</span>
      <SignatureMiniPipe aria-hidden className="shrink-0" />
      <SignatureInlineList
        items={details.map((detail) => <span key={detail}>{detail}</span>)}
        separator="pipe"
        className="min-w-0 flex-wrap justify-center gap-x-1 gap-y-0.5 text-[9px] font-medium tracking-normal"
        itemClassName="whitespace-nowrap"
      />
    </span>
  );
}

const ATTACHED_CARD_ACTION_STRIP_SHELL_CLASS_NAME = "-mt-px overflow-hidden rounded-b-[1.05rem] border border-t-0 border-[rgb(var(--accent-divider-rgb)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.16)]";

export function AttachedCardActionStripFrame({
  children,
  className,
  gridClassName = "grid-cols-2",
}: {
  children: ReactNode;
  className?: string;
  gridClassName?: string;
}) {
  return (
    <div className={cn(ATTACHED_CARD_ACTION_STRIP_SHELL_CLASS_NAME, className)}>
      <div className={cn("grid min-h-11 overflow-hidden rounded-b-[1.05rem]", gridClassName)}>
        {children}
      </div>
    </div>
  );
}

export function getAttachedCardActionButtonClassName({
  intent,
  className,
}: {
  intent?: BottomActionIntent;
  className?: string;
}) {
  return getBottomActionButtonClassName({
    intent,
    className: cn("!min-h-0 !h-11 !rounded-none !border-0 !px-4", className),
  });
}

export function AttachedQuickActionStrip({
  rowContract,
  onPress,
  logAllCount = 0,
  onSkip,
  className,
  gridClassName = "grid-cols-[74px_minmax(0,1fr)]",
}: {
  rowContract: {
    label: string;
    skipLabel: string;
    quickLogActionClassName?: string;
    skipActionClassName?: string;
    skipActionIntent?: "danger" | "info" | "positive" | "toggleInactive" | "toggleActive";
    actionRowClassName?: string;
    isSkipPending: boolean;
    isQuickLogPending: boolean;
    isQuickLogDisabled: boolean;
    isSkipDisabled: boolean;
    quickLogDisabledMessage: string;
  };
  onPress: () => Promise<void> | void;
  logAllCount?: number;
  onSkip?: () => Promise<void> | void;
  className?: string;
  gridClassName?: string;
}) {
  const actionRowClassName = rowContract.actionRowClassName;
  const skipActionClassName = rowContract.skipActionClassName;
  const quickLogActionClassName = rowContract.quickLogActionClassName;
  const isBusy = rowContract.isSkipPending || rowContract.isQuickLogPending;
  const isSkipDisabled = isBusy || rowContract.isSkipDisabled || !onSkip;
  const isQuickLogDisabled = isBusy || rowContract.isQuickLogDisabled;
  const showLogAll = logAllCount > 0;
  const handleLogAll = async () => {
    for (let index = 0; index < logAllCount; index += 1) {
      await onPress();
    }
  };
  const quickLogLabel = rowContract.isQuickLogDisabled
    ? rowContract.quickLogDisabledMessage
    : rowContract.isQuickLogPending
      ? "Adding..."
      : rowContract.label;
  const skipLabel = rowContract.isSkipPending ? "Saving..." : rowContract.skipLabel;

  return (
    <AttachedCardActionStripFrame className={className} gridClassName={gridClassName}>
      <button
        type="button"
        onClick={onSkip}
        disabled={isSkipDisabled}
        data-bottom-action-intent={rowContract.skipActionIntent}
        className={cn(
          getAttachedCardActionButtonClassName({
            intent: rowContract.skipActionIntent ?? "toggleInactive",
            className: "!border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)] focus-visible:ring-[rgb(var(--secondary-action-rgb)/0.2)]",
          }),
          rowContract.isSkipDisabled ? "border-r-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-muted)/0.92)] text-[rgb(var(--text-muted)/0.82)] shadow-none" : undefined,
          skipActionClassName,
        )}
      >
        <span className="bottom-action__label">{skipLabel}</span>
      </button>
      <button
        type="button"
        onClick={showLogAll ? () => { void handleLogAll(); } : onPress}
        disabled={isQuickLogDisabled}
        data-bottom-action-intent="positive"
        className={cn(
          getAttachedCardActionButtonClassName({
            intent: "positive",
            className: "translate-x-px focus-visible:ring-[rgb(var(--accent)/0.24)]",
          }),
          rowContract.isQuickLogPending
            ? "opacity-88"
            : isQuickLogDisabled
              ? "border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-muted)/0.92)] text-[rgb(var(--text-muted)/0.82)] shadow-none"
              : "",
          actionRowClassName,
          quickLogActionClassName,
        )}
        >
          {showLogAll ? (
            <span className="bottom-action__label text-[10px]">Log all</span>
          ) : (
            <span className={cn("bottom-action__label min-w-0", appTokens.currentSessionLoggerSummaryText)}>
              <QuickLogActionLabel label={quickLogLabel} />
            </span>
          )}
      </button>
    </AttachedCardActionStripFrame>
  );
}
