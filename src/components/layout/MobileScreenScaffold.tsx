"use client";

import type { ReactNode } from "react";
import { MobileScreenShell } from "@/components/shared/mobile-shell/MobileScreenShell";

type MobileScreenScaffoldProps = {
  children: ReactNode;
  topChrome?: ReactNode;
  floatingHeader?: ReactNode;
  bottomDock?: ReactNode;
  className?: string;
  scrollClassName?: string;
};

export function MobileScreenScaffold({
  children,
  topChrome,
  floatingHeader,
  bottomDock,
  className,
  scrollClassName,
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
    >
      {children}
    </MobileScreenShell>
  );
}
