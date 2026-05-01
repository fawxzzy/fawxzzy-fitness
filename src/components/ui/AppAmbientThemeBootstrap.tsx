"use client";

import { useLayoutEffect } from "react";
import { applyAmbientTheme, readStoredAmbientTheme } from "@/lib/ambient/theme";

export function AppAmbientThemeBootstrap() {
  useLayoutEffect(() => {
    applyAmbientTheme(readStoredAmbientTheme());
  }, []);

  return null;
}
