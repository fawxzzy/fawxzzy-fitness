"use client";

import { useLayoutEffect } from "react";
import { mergeAppBootPreferences, resolveAppBootPreferences } from "@/lib/app-boot-preferences";
import {
  applyAppTheme,
  applyResolvedStoredAppTheme,
  DEFAULT_APP_THEME,
  getAppThemeSignature,
  readStoredAppThemeSelection,
} from "@/lib/app-theme";
import { startLoadingDiagnosticGate } from "@/lib/loading-diagnostics";

export function AppThemeBootstrap() {
  useLayoutEffect(() => {
    const gate = startLoadingDiagnosticGate({
      gate: "app.theme-bootstrap",
      route: typeof window !== "undefined" ? window.location.pathname : null,
      source: "client",
      blockingReason: "Applying the persisted app theme before route paint.",
      timeoutMs: 2000,
    });

    try {
      const resolvedTheme = applyResolvedStoredAppTheme();
      const resolvedSelection = readStoredAppThemeSelection();
      const currentBootPreferences = resolveAppBootPreferences({
        cookieString: typeof document !== "undefined" ? document.cookie : null,
      });

      const currentThemeSignature = currentBootPreferences?.theme ? getAppThemeSignature(currentBootPreferences.theme) : null;
      const resolvedThemeSignature = getAppThemeSignature(resolvedTheme);

      if (currentThemeSignature !== resolvedThemeSignature || currentBootPreferences?.themeSelection !== resolvedSelection) {
        mergeAppBootPreferences({
          theme: resolvedTheme,
          themeSelection: resolvedSelection,
        });
      }
      gate.resolve();
    } catch (error) {
      try {
        applyAppTheme(DEFAULT_APP_THEME);
      } catch {
        // Keep the app usable even if resetting to the default theme also fails.
      }
      gate.error(error, {
        blockingReason: "Applying the persisted app theme failed.",
      });
      if (process.env.NODE_ENV !== "production") {
        console.warn("[app.theme-bootstrap] falling back to the default theme after a restore failure", error);
      }
    }
  }, []);

  return null;
}
