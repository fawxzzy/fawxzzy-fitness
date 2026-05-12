"use client";

import { useLayoutEffect } from "react";
import { mergeAppBootPreferences, resolveAppBootPreferences } from "@/lib/app-boot-preferences";
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
      const ambientTheme = readStoredAmbientTheme();
      applyAmbientTheme(ambientTheme);

      const currentBootPreferences = resolveAppBootPreferences({
        cookieString: typeof document !== "undefined" ? document.cookie : null,
      });
      if (currentBootPreferences?.ambientTheme !== ambientTheme) {
        mergeAppBootPreferences({
          ambientTheme,
        });
      }
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
