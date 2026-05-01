"use client";

import { useLayoutEffect } from "react";
import { applyAmbientTheme, readStoredAmbientTheme } from "@/lib/ambient/theme";
import { startLoadingDiagnosticGate } from "@/lib/loading-diagnostics";

export function AppAmbientThemeBootstrap() {
  useLayoutEffect(() => {
    const gate = startLoadingDiagnosticGate({
      gate: "app.ambient-theme-bootstrap",
      route: typeof window !== "undefined" ? window.location.pathname : null,
      source: "client",
      blockingReason: "Applying the persisted ambient theme before route paint.",
      timeoutMs: 2000,
    });

    try {
      applyAmbientTheme(readStoredAmbientTheme());
      gate.resolve();
    } catch (error) {
      gate.error(error, {
        blockingReason: "Applying the persisted ambient theme failed.",
      });
      throw error;
    }
  }, []);

  return null;
}
