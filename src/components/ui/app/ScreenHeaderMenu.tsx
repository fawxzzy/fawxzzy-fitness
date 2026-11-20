"use client";

import { createContext, type ReactNode, useContext } from "react";
import { screenHeaderTokens } from "@/components/ui/app/headerTokens";

// The app menu sits on the SAME line as the screen title, top right (DESIGN-CONTRACT.md section 15, "App menu").
// The screen shell owns which screens get the menu (`headerMenu` on MobileScreenShell); only the screen-level
// `ScreenHeader` that opts in with `appMenu` renders it in this slot (also when portaled in from a client component).
// Context passes through portals, so the opt-in is what keeps sheet and dialog headers menu-free.
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

  // The menu button is the notice anchor (PR #294 `data-app-notice-anchor`): floating notices sit 8px under the
  // button itself, not under the whole header row, which also holds the subtitle line below the title.
  return (
    <div className={screenHeaderTokens.menuSlot} data-screen-header-menu="true" data-app-notice-anchor="">
      {menu}
    </div>
  );
}
