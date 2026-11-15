"use client";

import Link from "next/link";
import type { MouseEventHandler } from "react";
import { screenHeaderTokens } from "@/components/ui/app/headerTokens";
import { useBackNavigation } from "@/components/ui/useBackNavigation";

// The one Back control for detail screens (DESIGN-CONTRACT.md section 15): a 44x44 left chevron in the
// `ScreenHeader` back slot. The accessible name says where it goes ("Back to History").
function BackChevron() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

type ScreenBackButtonProps = {
  /** Where Back goes when there is no in-app history to return to. */
  href: string;
  /** Accessible name; say where it goes, e.g. "Back to Today". */
  label?: string;
  historyBehavior?: "history-first" | "fallback-only";
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function ScreenBackButton({ href, label = "Back", historyBehavior = "history-first", onClick }: ScreenBackButtonProps) {
  const { navigateBack } = useBackNavigation({ fallbackHref: href, historyBehavior });

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-screen-back="true"
      className={screenHeaderTokens.iconAction}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        navigateBack();
      }}
    >
      <BackChevron />
    </button>
  );
}

/** Same look as `ScreenBackButton` for static pages (legal) that always go to one place. */
export function ScreenBackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link href={href} aria-label={label} title={label} data-screen-back="true" className={screenHeaderTokens.iconAction}>
      <BackChevron />
    </Link>
  );
}
