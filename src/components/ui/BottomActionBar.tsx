"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME } from "@/components/layout/CanonicalBottomActions";
import { cn } from "@/lib/cn";

export const BOTTOM_ACTION_BAR_HEIGHT_PX = 120;
export const FIXED_CTA_RESERVE_CLASS =
  "pb-[calc(var(--app-bottom-action-bar-height,120px)+var(--app-safe-bottom)+12px)]";
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
  const isPortaled = variant === "sticky" || variant === "fixed";

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && variant === "fixed") {
      console.warn("[BottomActionBar] variant='fixed' is discouraged. Prefer screen-owned sticky bottom actions rendered as the last child of ScrollContainer (Today pattern).");
    }
  }, [variant]);
  const fixedContainerRef = useRef<HTMLDivElement | null>(null);
  const [portalRoot] = useState<HTMLElement | null>(() => {
    if (!isPortaled || typeof window === "undefined") {
      return null;
    }

    return getOrCreateBottomBarPortalRoot();
  });

  useEffect(() => {
    if (!isPortaled || !fixedContainerRef.current || typeof window === "undefined") {
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
    };
  }, [isPortaled]);

  const content = useMemo(() => (
    <div
      ref={isPortaled ? fixedContainerRef : undefined}
      className={cn(
        "app-bottom-action-bar",
        "pointer-events-none fixed inset-x-0 bottom-0 z-50",
        className,
      )}
    >
      <div className={cn("mx-auto w-full max-w-md pointer-events-auto", BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME)}>
        <div
          className={cn(
            "flex items-center justify-center gap-4",
            "[&>*]:min-h-[44px] [&>*]:flex-1",
            innerClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  ), [children, className, innerClassName, isPortaled]);

  if (isPortaled && portalRoot) {
    return createPortal(content, portalRoot);
  }

  return content;
}
