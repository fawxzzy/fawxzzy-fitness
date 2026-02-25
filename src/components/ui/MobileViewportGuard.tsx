"use client";

import { useEffect } from "react";

const VIEWPORT_CONTENT = "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover";

export function MobileViewportGuard() {
  useEffect(() => {
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

    document.addEventListener("focusout", onFocusOut, true);

    return () => {
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, []);

  return null;
}
