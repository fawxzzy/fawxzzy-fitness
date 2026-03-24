"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type PointerState = {
  pointerId: number;
  startX: number;
  startY: number;
  intent: "pending" | "horizontal" | "vertical";
  startedOpen: boolean;
};

type SwipeActionRowProps = {
  id: string;
  isOpen: boolean;
  isDesktop: boolean;
  onOpenChange: (id: string | null) => void;
  children: ReactNode;
  trailingActions?: ReactNode;
  trailingWidthMobile: number;
  trailingWidthDesktop: number;
  leadingReveal?: ReactNode;
  leadingTriggerWidth?: number;
  onLeadingTrigger?: () => Promise<void> | void;
  disabled?: boolean;
  dismissSignal?: number;
  className?: string;
};

const SWIPE_LOCK_THRESHOLD = 12;
const SWIPE_ACTIVATION_THRESHOLD = 18;

export function SwipeActionRow({
  id,
  isOpen,
  isDesktop,
  onOpenChange,
  children,
  trailingActions,
  trailingWidthMobile,
  trailingWidthDesktop,
  leadingReveal,
  leadingTriggerWidth = 0,
  onLeadingTrigger,
  disabled = false,
  dismissSignal,
  className,
}: SwipeActionRowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerStateRef = useRef<PointerState | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const isDragging = pointerStateRef.current?.intent === "horizontal";

  useEffect(() => {
    if ((!isOpen || disabled) && dragOffset !== 0) {
      setDragOffset(0);
    }
  }, [disabled, dragOffset, isOpen]);

  useEffect(() => {
    setDragOffset(0);
    pointerStateRef.current = null;
    if (isOpen) onOpenChange(null);
  }, [dismissSignal, isOpen, onOpenChange]);

  useEffect(() => {
    if (!isOpen || disabled) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onOpenChange(null);
      }
    };

    const handleScroll = () => onOpenChange(null);

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [disabled, isOpen, onOpenChange]);

  const translateX = useMemo(() => {
    if (disabled) return 0;
    if (!trailingActions) return 0;
    if (isDragging) return dragOffset;
    return isOpen ? -(isDesktop ? trailingWidthDesktop : trailingWidthMobile) : 0;
  }, [disabled, dragOffset, isDesktop, isDragging, isOpen, trailingActions, trailingWidthDesktop, trailingWidthMobile]);

  const leadingProgress = leadingReveal && leadingTriggerWidth > 0 && translateX > 0
    ? Math.min(translateX / leadingTriggerWidth, 1)
    : 0;
  const activeTrailingWidth = isDesktop ? trailingWidthDesktop : trailingWidthMobile;

  const resetPointerState = () => {
    pointerStateRef.current = null;
    setDragOffset(0);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || isDesktop || event.pointerType === "mouse") return;

    pointerStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      intent: "pending",
      startedOpen: isOpen,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointerState = pointerStateRef.current;
    if (!pointerState || pointerState.pointerId !== event.pointerId || disabled || isDesktop || event.pointerType === "mouse") return;

    const deltaX = event.clientX - pointerState.startX;
    const deltaY = event.clientY - pointerState.startY;

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

    if (pointerState.intent !== "horizontal") return;

    event.preventDefault();
    const maxRight = leadingReveal ? leadingTriggerWidth + 28 : 0;
    const nextOffset = pointerState.startedOpen
      ? Math.min(Math.max(deltaX - trailingWidthMobile, -trailingWidthMobile), maxRight)
      : Math.min(Math.max(deltaX, -trailingWidthMobile), maxRight);

    setDragOffset(nextOffset);
  };

  const finishHorizontalGesture = async () => {
    const currentOffset = dragOffset;
    resetPointerState();

    if (leadingReveal && onLeadingTrigger && leadingTriggerWidth > 0 && currentOffset >= leadingTriggerWidth) {
      onOpenChange(null);
      await onLeadingTrigger();
      return;
    }

    if (currentOffset <= -(trailingWidthMobile / 2)) {
      onOpenChange(id);
      return;
    }

    onOpenChange(null);
  };

  const handlePointerUp = async (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointerState = pointerStateRef.current;
    if (!pointerState || pointerState.pointerId !== event.pointerId || disabled || isDesktop || event.pointerType === "mouse") return;

    if (pointerState.intent === "horizontal") {
      event.preventDefault();
      await finishHorizontalGesture();
      return;
    }

    resetPointerState();
  };

  const handlePointerCancel = () => resetPointerState();

  return (
    <div
      ref={containerRef}
      className={cn("group/swipe-row relative overflow-hidden rounded-[1.3rem]", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      onMouseEnter={isDesktop && !disabled ? () => onOpenChange(id) : undefined}
      onMouseLeave={isDesktop && !disabled ? () => onOpenChange(null) : undefined}
      onFocusCapture={() => {
        if (isDesktop && !disabled) onOpenChange(id);
      }}
      onBlurCapture={(event) => {
        if (isDesktop && !disabled && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onOpenChange(null);
        }
      }}
    >
      {leadingReveal ? (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 flex items-center justify-start rounded-[1.3rem] pl-3 text-sm font-semibold transition-opacity duration-200",
            leadingProgress > 0 ? "opacity-100" : "opacity-0",
          )}
          style={{ width: `${Math.max(leadingTriggerWidth + 34, 112)}px` }}
        >
          {leadingReveal}
        </div>
      ) : null}

      {trailingActions ? (
        <div className="absolute inset-y-0 right-0 flex items-stretch justify-end overflow-hidden rounded-[1.3rem]" style={{ width: `${activeTrailingWidth}px` }}>
          {trailingActions}
        </div>
      ) : null}

      <div
        className={cn(
          "relative z-10 transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none",
          isDragging ? "duration-75" : "",
          isDesktop && !disabled && trailingActions ? `group-focus-within/swipe-row:-translate-x-[var(--desktop-swipe-width)] group-hover/swipe-row:-translate-x-[var(--desktop-swipe-width)]` : "",
        )}
        style={{
          ...(isDesktop && trailingActions ? { ["--desktop-swipe-width" as string]: `${trailingWidthDesktop}px` } : null),
          ...(isDesktop ? undefined : { transform: `translateX(${translateX}px)` }),
        }}
      >
        {children}
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-[1.3rem] ring-1 ring-transparent transition group-focus-within/swipe-row:ring-accent/20" />
    </div>
  );
}
