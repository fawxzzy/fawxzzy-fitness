"use client";

import type { ReactNode } from "react";
import { MobileScreenShell } from "@/components/shared/mobile-shell/MobileScreenShell";

type MobileScreenScaffoldProps = {
  children: ReactNode;
  topChrome?: ReactNode;
  bottomDock?: ReactNode;
  className?: string;
  scrollClassName?: string;
};

export function MobileScreenScaffold({
  children,
  topChrome,
  bottomDock,
  className,
  scrollClassName,
}: MobileScreenScaffoldProps) {
  return (
    <MobileScreenShell
      className={className}
      scrollClassName={scrollClassName}
      topChrome={topChrome}
      bottomDock={bottomDock}
    >
      {children}
    </MobileScreenShell>
  );
}
