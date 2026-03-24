"use client";

import { useState, type ReactNode } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { SwipeActionRow } from "@/components/ui/SwipeActionRow";
import { cn } from "@/lib/cn";

const MOBILE_TRAILING_ACTION_WIDTH = 104;
const DESKTOP_ACTION_WIDTH = 208;
const QUICK_LOG_TRIGGER = 78;

type SessionExerciseActionRowProps = {
  id: string;
  isOpen: boolean;
  isDesktop: boolean;
  quickLogLabel?: string;
  skipLabel: string;
  onOpenChange: (id: string | null) => void;
  onQuickLog: () => Promise<void> | void;
  onSkip: () => Promise<void> | void;
  children: ReactNode;
};

export function SessionExerciseActionRow({
  id,
  isOpen,
  isDesktop,
  quickLogLabel = "Quick Log",
  skipLabel,
  onOpenChange,
  onQuickLog,
  onSkip,
  children,
}: SessionExerciseActionRowProps) {
  const [isQuickLogging, setIsQuickLogging] = useState(false);
  const [isSkipPending, setIsSkipPending] = useState(false);

  return (
    <SwipeActionRow
      id={id}
      isDesktop={isDesktop}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      trailingWidthMobile={MOBILE_TRAILING_ACTION_WIDTH}
      trailingWidthDesktop={DESKTOP_ACTION_WIDTH}
      leadingTriggerWidth={QUICK_LOG_TRIGGER}
      onLeadingTrigger={async () => {
        setIsQuickLogging(true);
        try {
          await onQuickLog();
        } finally {
          setIsQuickLogging(false);
        }
      }}
      leadingReveal={(
        <div
          className="flex h-full items-center text-emerald-50"
          style={{
            background: `linear-gradient(90deg, rgba(16,185,129,0.6), rgba(16,185,129,0.1))`,
          }}
        >
          {isQuickLogging ? "Logging…" : quickLogLabel}
        </div>
      )}
      trailingActions={isDesktop ? (
        <div className={cn(
          "flex h-full w-[13rem] items-center justify-center gap-2 rounded-[1.3rem] border border-border/24 bg-[rgb(var(--surface-2-soft)/0.9)] p-2 transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 group-focus-within/swipe-row:opacity-100 group-hover/swipe-row:opacity-100",
        )}>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-full flex-1 border-emerald-300/25 bg-emerald-400/14 text-emerald-50 hover:bg-emerald-400/20 focus-visible:ring-2 focus-visible:ring-emerald-300/30"
            onClick={async () => {
              setIsQuickLogging(true);
              try {
                await onQuickLog();
              } finally {
                setIsQuickLogging(false);
                onOpenChange(null);
              }
            }}
            disabled={isQuickLogging}
          >
            {isQuickLogging ? "Logging…" : quickLogLabel}
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-full flex-1 border-amber-300/28 bg-amber-400/14 text-amber-100 hover:bg-amber-400/20 focus-visible:ring-2 focus-visible:ring-amber-300/30"
            onClick={async () => {
              setIsSkipPending(true);
              try {
                await onSkip();
              } finally {
                setIsSkipPending(false);
                onOpenChange(null);
              }
            }}
            disabled={isSkipPending}
          >
            {isSkipPending ? "Saving…" : skipLabel}
          </AppButton>
        </div>
      ) : (
        <div className={cn(
          "flex h-full w-[6.5rem] items-center justify-center rounded-[1.3rem] border border-amber-300/22 bg-amber-400/12 p-2 transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 group-focus-within/swipe-row:opacity-100",
        )}>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-full w-full border-amber-300/28 bg-amber-400/14 text-amber-100 hover:bg-amber-400/20 focus-visible:ring-2 focus-visible:ring-amber-300/30"
            onClick={async () => {
              setIsSkipPending(true);
              try {
                await onSkip();
              } finally {
                setIsSkipPending(false);
                onOpenChange(null);
              }
            }}
            disabled={isSkipPending}
          >
            {isSkipPending ? "Saving…" : skipLabel}
          </AppButton>
        </div>
      )}
    >
      <div className="group/card relative">
        <div className="sr-only" aria-live="polite">{isOpen ? `${skipLabel} action available` : ""}</div>
        {children}
      </div>
    </SwipeActionRow>
  );
}
