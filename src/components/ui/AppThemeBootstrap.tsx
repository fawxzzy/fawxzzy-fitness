"use client";

import { useLayoutEffect } from "react";
import { applyAppTheme, resolveStoredAppTheme } from "@/lib/app-theme";
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
      gate.error(error, {
        blockingReason: "Applying the persisted app theme failed.",
      });
      throw error;
    }
  }, []);

  return null;
}
