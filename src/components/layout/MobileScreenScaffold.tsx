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
