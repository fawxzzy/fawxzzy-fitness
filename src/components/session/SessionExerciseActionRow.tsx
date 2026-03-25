"use client";

import { useState, type ReactNode } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { SwipeActionRow } from "@/components/ui/SwipeActionRow";
import { cn } from "@/lib/cn";
import { getSwipeRailShellClassName, swipeRailInteractionTokens, swipeRailSlotBaseClassName } from "@/components/ui/swipeRailStyles";

const MOBILE_TRAILING_ACTION_WIDTH = swipeRailInteractionTokens.mobileTrailingWidth;
const DESKTOP_ACTION_WIDTH = swipeRailInteractionTokens.desktopTrailingWidth;
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
        <div className={getSwipeRailShellClassName({ columnCount: 2, isVisible: isOpen })}>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            className={cn(swipeRailSlotBaseClassName, "text-emerald-50 hover:bg-[rgb(var(--bg)/0.16)] focus-visible:ring-2 focus-visible:ring-emerald-300/30")}
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
            className={cn(swipeRailSlotBaseClassName, "text-amber-100 hover:bg-rose-400/14 focus-visible:ring-2 focus-visible:ring-amber-300/30")}
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
        <div className={getSwipeRailShellClassName({ columnCount: 1, isVisible: isOpen })}>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            className={cn(swipeRailSlotBaseClassName, "text-amber-100 hover:bg-rose-400/14 focus-visible:ring-2 focus-visible:ring-amber-300/30")}
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
