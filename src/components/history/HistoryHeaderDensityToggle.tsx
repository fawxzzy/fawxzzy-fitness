"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HISTORY_HEADER_TRAILING_SLOT_ID } from "@/components/history/HistoryShared";
import { screenHeaderTokens } from "@/components/ui/app/headerTokens";

type HistoryViewMode = "compact" | "detailed";

/**
 * Compact / Detailed rows as the History header's one trailing 44x44 action (DESIGN-CONTRACT.md section 15).
 * One static label plus `aria-pressed`: screen readers hear "Show detailed rows, pressed" or "not pressed".
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
  const label = "Show detailed rows";

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
      {/* Never three equal bars: that is the app menu button, which sits right next to this one. Compact = a
          bulleted list, detailed = two row cards. */}
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {showingDetails ? (
          <>
            <rect x="4" y="4.5" width="16" height="6.5" rx="1.5" />
            <rect x="4" y="13" width="16" height="6.5" rx="1.5" />
          </>
        ) : (
          <>
            <path d="M5 7h.01" />
            <path d="M9 7h10" />
            <path d="M5 12h.01" />
            <path d="M9 12h10" />
            <path d="M5 17h.01" />
            <path d="M9 17h10" />
          </>
        )}
      </svg>
    </button>,
    container,
  );
}
