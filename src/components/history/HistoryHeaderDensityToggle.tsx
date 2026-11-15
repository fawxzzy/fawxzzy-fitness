"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HISTORY_HEADER_TRAILING_SLOT_ID } from "@/components/history/HistoryShared";
import { screenHeaderTokens } from "@/components/ui/app/headerTokens";

type HistoryViewMode = "compact" | "detailed";

/**
 * Compact / Detailed rows as the History header's one trailing 44x44 action (DESIGN-CONTRACT.md section 15).
 * The label says what a tap does; `aria-pressed` says whether details are showing.
 */
export function HistoryHeaderDensityToggle({
  scope,
  viewMode,
  onViewModeChange,
}: {
  scope: "sessions" | "exercises";
  viewMode: HistoryViewMode;
  onViewModeChange: (nextMode: HistoryViewMode) => void;
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(document.getElementById(HISTORY_HEADER_TRAILING_SLOT_ID));
  }, []);

  if (!container) {
    return null;
  }

  const showingDetails = viewMode === "detailed";
  const label = showingDetails ? "Show compact rows" : "Show detailed rows";

  return createPortal(
    <button
      type="button"
      className={screenHeaderTokens.iconAction}
      aria-label={label}
      aria-pressed={showingDetails}
      title={label}
      data-history-density-toggle={scope}
      onClick={() => onViewModeChange(showingDetails ? "compact" : "detailed")}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        {showingDetails ? (
          <>
            <path d="M4 6h16" />
            <path d="M4 10h10" />
            <path d="M4 15h16" />
            <path d="M4 19h10" />
          </>
        ) : (
          <>
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </>
        )}
      </svg>
    </button>,
    container,
  );
}
