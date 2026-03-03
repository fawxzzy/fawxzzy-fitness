"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const BOTTOM_ACTION_BAR_HEIGHT_PX = 120;
// Apply this to the one vertical scroll-owner container on routes that render variant="fixed".
// Do not add extra bottom padding elsewhere to compensate for overlap.
export const FIXED_CTA_RESERVE_CLASS = `pb-[calc(var(--app-bottom-action-bar-height,${BOTTOM_ACTION_BAR_HEIGHT_PX}px)+env(safe-area-inset-bottom,0px)+3px)]`;
export const BOTTOM_ACTION_BAR_CONTENT_RESERVE_CLASS = FIXED_CTA_RESERVE_CLASS;

const BOTTOM_ACTION_BAR_PORTAL_ROOT_ID = "app-bottom-action-bar-root";
const BOTTOM_ACTION_BAR_HEIGHT_VAR = "--app-bottom-action-bar-height";

export function BottomActionBar({
  children,
  className,
  innerClassName,
  variant = "fixed",
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  variant?: "sticky" | "fixed";
}) {
  const isFixed = variant === "fixed";
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isFixed) return;

    let root = document.getElementById(BOTTOM_ACTION_BAR_PORTAL_ROOT_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = BOTTOM_ACTION_BAR_PORTAL_ROOT_ID;
      document.body.appendChild(root);
    }

    setPortalRoot(root);
  }, [isFixed]);

  useEffect(() => {
    if (!isFixed || !innerRef.current) return;

    const target = innerRef.current;
    const setHeightVar = () => {
      const { height } = target.getBoundingClientRect();
      if (height > 0) {
        document.documentElement.style.setProperty(BOTTOM_ACTION_BAR_HEIGHT_VAR, `${Math.ceil(height)}px`);
      }
    };

    setHeightVar();
    const observer = new ResizeObserver(setHeightVar);
    observer.observe(target);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(BOTTOM_ACTION_BAR_HEIGHT_VAR);
    };
  }, [isFixed, portalRoot]);

  const content = useMemo(() => (
    <div
      className={cn(
        "app-bottom-action-bar",
        isFixed ? "pointer-events-none fixed inset-x-0 bottom-0 z-50" : "sticky bottom-0 z-50 pt-[3px]",
        className,
      )}
    >
      <div className={cn("mx-auto w-full max-w-md px-3", isFixed ? "pointer-events-auto" : undefined)}>
        <div
          ref={innerRef}
          className={cn(
            "flex items-center justify-center gap-3 rounded-2xl border border-[rgb(var(--glass-tint-rgb)/0.34)] bg-[rgb(var(--glass-tint-rgb)/0.72)] px-4 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+3px)] shadow-[0_10px_24px_rgb(0_0_0/0.32)] backdrop-blur-md",
            "[&>*]:min-h-[44px] [&>*]:flex-1",
            innerClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  ), [children, className, innerClassName, isFixed]);

  if (isFixed) {
    return portalRoot ? createPortal(content, portalRoot) : null;
  }

  return content;
}
