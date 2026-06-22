"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const INLINE_EDGE_CONTROL_NUMERIC_GLYPH_CLASS_NAME = "text-[20px] font-semibold";

export function InlineEdgeControlButton({
  side,
  onClick,
  ariaLabel,
  children,
  className,
  contentClassName,
  contentStyle,
  style,
}: {
  side: "left" | "right";
  onClick: () => void;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
      onTouchStart={(event) => {
        event.stopPropagation();
      }}
      aria-label={ariaLabel}
      className={cn(
        "pointer-events-auto absolute top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 appearance-none items-center justify-center border-0 !bg-transparent p-0 shadow-none outline-none ring-0 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-0 [touch-action:manipulation]",
        side === "left" ? "left-1.5" : "right-1.5",
        className,
      )}
      style={{ border: "0", borderWidth: 0, boxShadow: "none", background: "transparent", backgroundColor: "transparent", color: "rgb(var(--accent))", ...style }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none relative -top-px flex h-8 w-full items-center justify-center !bg-transparent leading-none text-[rgb(var(--accent))]",
          INLINE_EDGE_CONTROL_NUMERIC_GLYPH_CLASS_NAME,
          contentClassName,
        )}
        style={{ background: "transparent", backgroundColor: "transparent", ...contentStyle }}
      >
        {children}
      </span>
    </button>
  );
}
