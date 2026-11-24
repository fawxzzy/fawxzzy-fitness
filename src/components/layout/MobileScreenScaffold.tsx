"use client";

import type { ReactNode } from "react";
import { MobileScreenShell } from "@/components/shared/mobile-shell/MobileScreenShell";

type MobileScreenScaffoldProps = {
  children: ReactNode;
  topChrome?: ReactNode;
  headerMenu?: ReactNode;
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
};

export function MobileScreenScaffold({
  children,
  topChrome,
  headerMenu,
  floatingHeader,
  bottomDock,
  className,
  scrollClassName,
  noticesInFlow,
}: MobileScreenScaffoldProps) {
  // Mobile shell contract:
  // All route headers must use `floatingHeader`; scroll headers are deprecated.
  return (
    <MobileScreenShell
      className={className}
      scrollClassName={scrollClassName}
      topChrome={topChrome}
      headerMenu={headerMenu}
      floatingHeader={floatingHeader}
      bottomDock={bottomDock}
      noticesInFlow={noticesInFlow}
    >
      {children}
    </MobileScreenShell>
  );
}
