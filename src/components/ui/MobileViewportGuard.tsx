"use client";

import { useEffect } from "react";

const VIEWPORT_CONTENT = "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover";

export function MobileViewportGuard() {
  useEffect(() => {
    const rootStyle = document.documentElement.style;
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      return;
    }

    viewportMeta.setAttribute("content", VIEWPORT_CONTENT);

    const onFocusOut = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
        return;
      }

      viewportMeta.setAttribute("content", VIEWPORT_CONTENT);
    };

    const syncVisualViewportInset = () => {
      const topInset = Math.max(window.visualViewport?.offsetTop ?? 0, 0);
      rootStyle.setProperty("--vv-top", `${topInset}px`);
    };

    syncVisualViewportInset();

    window.visualViewport?.addEventListener("resize", syncVisualViewportInset);
    window.visualViewport?.addEventListener("scroll", syncVisualViewportInset);
    window.addEventListener("resize", syncVisualViewportInset);

    document.addEventListener("focusout", onFocusOut, true);

    return () => {
      document.removeEventListener("focusout", onFocusOut, true);
      window.visualViewport?.removeEventListener("resize", syncVisualViewportInset);
      window.visualViewport?.removeEventListener("scroll", syncVisualViewportInset);
      window.removeEventListener("resize", syncVisualViewportInset);
      rootStyle.setProperty("--vv-top", "0px");
    };
  }, []);

  return null;
}
