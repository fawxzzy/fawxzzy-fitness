"use client";

import type { MouseEventHandler } from "react";
import { screenHeaderTokens } from "@/components/ui/app/headerTokens";
import { useBackNavigation } from "@/components/ui/useBackNavigation";

// The Back control for `ScreenHeader kind="detail"` (DESIGN-CONTRACT.md section 15): 44x44, top LEFT, the same
// quiet icon-button look as the header's trailing action. `href` is where Back goes when there is no in-app
// history to return to. `onClick` may call `event.preventDefault()` to take over (e.g. an unsaved-changes guard).
export function ScreenHeaderBackButton({
  href,
  label = "Back",
  historyBehavior = "fallback-only",
  onClick,
}: {
  href?: string;
  label?: string;
  historyBehavior?: "history-first" | "fallback-only";
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  const { navigateBack } = useBackNavigation({ fallbackHref: href, historyBehavior });

  return (
    <button
      type="button"
      aria-label={label}
      data-screen-header-back="true"
      className={screenHeaderTokens.iconAction}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        navigateBack();
      }}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
        <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
