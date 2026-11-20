"use client";

import { type RefObject, useLayoutEffect } from "react";
import { APP_NOTICE_ANCHOR_ATTRIBUTE, APP_NOTICE_TOP_VAR, computeNoticeAnchorTop } from "@/lib/app-notice-anchor";

let activeOwner: symbol | null = null;

function readRect(node: Element | null | undefined) {
  if (!node) return null;
  const { bottom, height } = node.getBoundingClientRect();
  return { bottom, height };
}

/**
 * Keeps `--app-notice-top` on <html> equal to the bottom of this screen's header row, so the shared toast stack sits
 * right under it (and under the header menu button) whatever the safe area or header height. The newest mounted
 * shell owns the variable; on unmount it hands back to the CSS fallback.
 */
export function useAppNoticeAnchor({
  shellRef,
  topChromeRef,
  floatingHeaderRef,
  layoutKey,
}: {
  shellRef: RefObject<HTMLElement | null>;
  topChromeRef: RefObject<HTMLElement | null>;
  floatingHeaderRef: RefObject<HTMLElement | null>;
  /** Changes when the header slots mount/unmount, so the observers re-attach. */
  layoutKey: string;
}) {
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const owner = Symbol("app-notice-anchor");
    activeOwner = owner;
    const root = document.documentElement;

    const sync = () => {
      if (activeOwner !== owner) return;
      const top = computeNoticeAnchorTop({
        anchor: readRect(shellRef.current?.querySelector(`[${APP_NOTICE_ANCHOR_ATTRIBUTE}]`)),
        floatingHeader: readRect(floatingHeaderRef.current),
        topChrome: readRect(topChromeRef.current),
      });
      if (top === null) {
        root.style.removeProperty(APP_NOTICE_TOP_VAR);
      } else {
        root.style.setProperty(APP_NOTICE_TOP_VAR, `${top}px`);
      }
    };

    sync();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    for (const node of [topChromeRef.current, floatingHeaderRef.current]) {
      if (node) observer?.observe(node);
    }
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      if (activeOwner === owner) {
        activeOwner = null;
        root.style.removeProperty(APP_NOTICE_TOP_VAR);
      }
    };
  }, [shellRef, topChromeRef, floatingHeaderRef, layoutKey]);
}
