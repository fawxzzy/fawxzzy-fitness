"use client";

import type { ReactNode } from "react";
import { MobileScreenShell } from "@/components/shared/mobile-shell/MobileScreenShell";
import type { NoticePlacement } from "@/components/ui/ToastProvider";

type MobileScreenScaffoldProps = {
  children: ReactNode;
  topChrome?: ReactNode;
  floatingHeader?: ReactNode;
  bottomDock?: ReactNode;
  className?: string;
  scrollClassName?: string;
  /**
   * Which notices render in flow under the header (content moves down) instead of floating over it. Default
   * "errors": only error notices. "all": every tone, for dense screens where a floating notice covers a card title
   * (the workout screen, 2026-11-23).
   */
  noticesInFlow?: "errors" | "all";
  /**
   * Where the notice slot sits. Default "under-header" (in flow, see noticesInFlow). "above-dock": an overlay pinned
   * just above the bottom dock that takes every tone, one notice at a time, and never moves a card (the workout
   * screen, 2026-11-24).
   */
  noticePlacement?: NoticePlacement;
};

export function MobileScreenScaffold({
  children,
  topChrome,
  floatingHeader,
  bottomDock,
  className,
  scrollClassName,
  noticesInFlow,
  noticePlacement,
}: MobileScreenScaffoldProps) {
  // Mobile shell contract:
  // All route headers must use `floatingHeader`; scroll headers are deprecated.
  return (
    <MobileScreenShell
      className={className}
      scrollClassName={scrollClassName}
      topChrome={topChrome}
      floatingHeader={floatingHeader}
      bottomDock={bottomDock}
      noticesInFlow={noticesInFlow}
      noticePlacement={noticePlacement}
    >
      {children}
    </MobileScreenShell>
  );
}
