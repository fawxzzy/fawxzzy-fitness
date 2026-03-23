"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { cn } from "@/lib/cn";

const MOBILE_TRAILING_ACTION_WIDTH = 104;
const DESKTOP_ACTION_WIDTH = 208;
const QUICK_LOG_TRIGGER = 78;
const SWIPE_LOCK_THRESHOLD = 12;
const SWIPE_ACTIVATION_THRESHOLD = 18;

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

type PointerState = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  intent: "pending" | "horizontal" | "vertical";
  startedOpen: boolean;
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerStateRef = useRef<PointerState | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isQuickLogging, setIsQuickLogging] = useState(false);
  const [isSkipPending, setIsSkipPending] = useState(false);
  const isDragging = pointerStateRef.current?.intent === "horizontal";

  useEffect(() => {
    if (!isOpen && dragOffset !== 0) {
      setDragOffset(0);
    }
  }, [dragOffset, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onOpenChange(null);
      }
    };

    const handleScroll = () => {
      onOpenChange(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, onOpenChange]);

  const translateX = useMemo(() => {
    if (isDragging) {
      return dragOffset;
    }

    return isOpen ? -(isDesktop ? DESKTOP_ACTION_WIDTH : MOBILE_TRAILING_ACTION_WIDTH) : 0;
  }, [dragOffset, isDesktop, isDragging, isOpen]);

  const quickLogProgress = translateX > 0 ? Math.min(translateX / QUICK_LOG_TRIGGER, 1) : 0;

  const resetPointerState = () => {
    pointerStateRef.current = null;
    setDragOffset(0);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isDesktop || event.pointerType === "mouse") {
      return;
    }

    pointerStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      intent: "pending",
      startedOpen: isOpen,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointerState = pointerStateRef.current;
    if (!pointerState || pointerState.pointerId !== event.pointerId || isDesktop || event.pointerType === "mouse") {
      return;
    }

    const deltaX = event.clientX - pointerState.startX;
    const deltaY = event.clientY - pointerState.startY;
    pointerState.lastX = event.clientX;

    if (pointerState.intent === "pending") {
      if (Math.abs(deltaY) > SWIPE_LOCK_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
        pointerState.intent = "vertical";
        setDragOffset(0);
        return;
      }

      if (Math.abs(deltaX) > SWIPE_ACTIVATION_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
        pointerState.intent = "horizontal";
        onOpenChange(pointerState.startedOpen ? id : null);
      }
    }

    if (pointerState.intent !== "horizontal") {
      return;
    }

    event.preventDefault();
    const nextOffset = pointerState.startedOpen
      ? Math.min(Math.max(deltaX - MOBILE_TRAILING_ACTION_WIDTH, -MOBILE_TRAILING_ACTION_WIDTH), QUICK_LOG_TRIGGER + 28)
      : Math.min(Math.max(deltaX, -MOBILE_TRAILING_ACTION_WIDTH), QUICK_LOG_TRIGGER + 28);

    setDragOffset(nextOffset);
  };

  const finishHorizontalGesture = async () => {
    const currentOffset = dragOffset;
    resetPointerState();

    if (currentOffset >= QUICK_LOG_TRIGGER) {
      onOpenChange(null);
      setIsQuickLogging(true);
      try {
        await onQuickLog();
      } finally {
        setIsQuickLogging(false);
      }
      return;
    }

    if (currentOffset <= -(MOBILE_TRAILING_ACTION_WIDTH / 2)) {
      onOpenChange(id);
      return;
    }

    onOpenChange(null);
  };

  const handlePointerUp = async (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointerState = pointerStateRef.current;
    if (!pointerState || pointerState.pointerId !== event.pointerId || isDesktop || event.pointerType === "mouse") {
      return;
    }

    if (pointerState.intent === "horizontal") {
      event.preventDefault();
      await finishHorizontalGesture();
      return;
    }

    resetPointerState();
  };

  const handlePointerCancel = () => {
    resetPointerState();
  };

  return (
    <div
      ref={containerRef}
      className="group/session-row relative overflow-hidden rounded-[1.3rem]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      onMouseEnter={isDesktop ? () => onOpenChange(id) : undefined}
      onMouseLeave={isDesktop ? () => onOpenChange(null) : undefined}
      onFocusCapture={() => {
        if (isDesktop) {
          onOpenChange(id);
        }
      }}
      onBlurCapture={(event) => {
        if (isDesktop && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onOpenChange(null);
        }
      }}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 flex w-[7rem] items-center justify-start rounded-[1.3rem] pl-3 text-sm font-semibold text-emerald-50 transition-opacity duration-200",
          quickLogProgress > 0 ? "opacity-100" : "opacity-0",
        )}
        style={{
          background: `linear-gradient(90deg, rgba(16,185,129,${0.2 + quickLogProgress * 0.4}), rgba(16,185,129,0.1))`,
        }}
      >
        {isQuickLogging ? "Logging…" : quickLogLabel}
      </div>

      <div className="absolute inset-y-0 right-0 flex items-stretch justify-end gap-2 pr-0">
        {isDesktop ? (
          <div className={cn(
            "flex h-full w-[13rem] items-center justify-center gap-2 rounded-[1.3rem] border border-border/24 bg-[rgb(var(--surface-2-soft)/0.9)] p-2 transition-opacity duration-200",
            isOpen ? "opacity-100" : "opacity-0 group-focus-within/session-row:opacity-100 group-hover/session-row:opacity-100",
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
          <div
            className={cn(
              "flex h-full w-[6.5rem] items-center justify-center rounded-[1.3rem] border border-amber-300/22 bg-amber-400/12 p-2 transition-opacity duration-200",
              isOpen ? "opacity-100" : "opacity-0 group-focus-within/session-row:opacity-100",
            )}
          >
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
      </div>

      <div
        className={cn(
          "relative z-10 transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none",
          isDragging ? "duration-75" : "",
          isDesktop ? "group-focus-within/session-row:-translate-x-[208px] group-hover/session-row:-translate-x-[208px]" : "",
        )}
        style={isDesktop ? undefined : { transform: `translateX(${translateX}px)` }}
      >
        <div className="group/card relative">
          <div className="sr-only" aria-live="polite">{isOpen ? `${skipLabel} action available` : ""}</div>
          {children}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-[1.3rem] ring-1 ring-transparent transition group-focus-within/session-row:ring-accent/20" />
    </div>
  );
}
