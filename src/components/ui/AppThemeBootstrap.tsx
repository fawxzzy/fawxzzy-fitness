"use client";

import { useLayoutEffect } from "react";
import { applyAppTheme, DEFAULT_APP_THEME, resolveStoredAppTheme } from "@/lib/app-theme";
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
      applyAppTheme(resolveStoredAppTheme());
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
