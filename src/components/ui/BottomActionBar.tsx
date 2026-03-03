"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export const BOTTOM_ACTION_BAR_HEIGHT_PX = 120;
export const FIXED_CTA_RESERVE_CLASS = `pb-[calc(var(--app-bottom-action-bar-height,${BOTTOM_ACTION_BAR_HEIGHT_PX}px)+env(safe-area-inset-bottom,0px)+3px)]`;
export const BOTTOM_ACTION_BAR_CONTENT_RESERVE_CLASS = FIXED_CTA_RESERVE_CLASS;

const BOTTOM_ACTION_BAR_ROOT_ID = "app-bottom-action-bar-root";

const getOrCreateBottomBarPortalRoot = () => {
  const existing = document.getElementById(BOTTOM_ACTION_BAR_ROOT_ID);
  if (existing) {
    return existing;
  }

  const root = document.createElement("div");
  root.id = BOTTOM_ACTION_BAR_ROOT_ID;
  document.body.appendChild(root);
  return root;
};

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

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && variant === "fixed") {
      console.warn("[BottomActionBar] variant='fixed' is legacy; prefer sticky bottom actions rendered as last child of ScrollContainer.");
    }
  }, [variant]);
  const fixedContainerRef = useRef<HTMLDivElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isFixed) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    setPortalRoot(getOrCreateBottomBarPortalRoot());
  }, [isFixed]);

  useEffect(() => {
    if (!isFixed || !fixedContainerRef.current || typeof window === "undefined") {
      return;
    }

    const updateHeightVar = () => {
      const nextHeight = fixedContainerRef.current?.getBoundingClientRect().height;
      if (!nextHeight) {
        return;
      }
      document.documentElement.style.setProperty("--app-bottom-action-bar-height", `${Math.ceil(nextHeight)}px`);
    };

    updateHeightVar();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateHeightVar();
    });

    observer.observe(fixedContainerRef.current);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--app-bottom-action-bar-height");
    };
  }, [isFixed]);

  const content = useMemo(() => (
    <div
      ref={isFixed ? fixedContainerRef : undefined}
      className={cn(
        "app-bottom-action-bar",
        isFixed ? "pointer-events-none fixed inset-x-0 bottom-0 z-50" : "sticky bottom-0 z-50 pt-[3px]",
        className,
      )}
    >
      <div className={cn("mx-auto w-full max-w-md px-3", isFixed ? "pointer-events-auto" : undefined)}>
        <div
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

  if (isFixed && portalRoot) {
    return createPortal(content, portalRoot);
  }

  return content;
}
