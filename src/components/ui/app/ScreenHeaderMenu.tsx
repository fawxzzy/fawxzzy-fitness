"use client";

import { createContext, type ReactNode, useContext } from "react";
import { screenHeaderTokens } from "@/components/ui/app/headerTokens";

// The app menu sits on the SAME line as the screen title, top right (DESIGN-CONTRACT.md section 15, "App menu").
// The screen shell owns which screens get the menu (`headerMenu` on MobileScreenShell); every `ScreenHeader`
// inside that shell, including headers portaled in from a client component, renders it in this slot.
const ScreenHeaderMenuContext = createContext<ReactNode>(null);

export function ScreenHeaderMenuProvider({ menu, children }: { menu?: ReactNode; children: ReactNode }) {
  return <ScreenHeaderMenuContext.Provider value={menu ?? null}>{children}</ScreenHeaderMenuContext.Provider>;
}

export function useScreenHeaderMenu(): ReactNode {
  return useContext(ScreenHeaderMenuContext);
}

export function ScreenHeaderMenuSlot() {
  const menu = useScreenHeaderMenu();
  if (!menu) {
    return null;
  }

  return (
    <div className={screenHeaderTokens.menuSlot} data-screen-header-menu="true">
      {menu}
    </div>
  );
}
