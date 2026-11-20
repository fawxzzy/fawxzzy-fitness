"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AppBackdropVariant } from "@/lib/ambient/app-backdrop";

/**
 * Static app backdrop (see src/lib/ambient/app-backdrop.ts). Purely decorative: aria-hidden, pointer-events none,
 * absolutely positioned behind content, so it can never shift layout or take a tap. Colours come only from theme
 * tokens (--bg-0/--bg-1/--accent/--ambient-line-*), so every ambient theme restyles it. The top layer is a
 * safe-area scrim (env(safe-area-inset-top)) that keeps the status bar readable in the installed app.
 */
export function AppBackdrop({ variant }: { variant: AppBackdropVariant }) {
  return (
    <div aria-hidden="true" className="app-backdrop" data-app-backdrop={variant}>
      <div className="app-backdrop__base" />
      <div className="app-backdrop__pattern" />
      <div className="app-backdrop__scrim" />
    </div>
  );
}

const AppBackdropOverrideContext = createContext<AppBackdropVariant | null>(null);

/**
 * Dev-only override used by the preview routes under /dev/mobile-regression (`?backdrop=`): the shell there draws
 * its own chrome, and this tells it which backdrop to draw. Production routes never mount it.
 */
export function AppBackdropOverride({ variant, children }: { variant: AppBackdropVariant; children: ReactNode }) {
  return <AppBackdropOverrideContext.Provider value={variant}>{children}</AppBackdropOverrideContext.Provider>;
}

export function useAppBackdropOverride() {
  return useContext(AppBackdropOverrideContext);
}
