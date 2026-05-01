"use client";

import { useLayoutEffect } from "react";
import { applyAppTheme, DEFAULT_APP_THEME, readStoredAppTheme } from "@/lib/app-theme";

export function AppThemeBootstrap() {
  useLayoutEffect(() => {
    applyAppTheme(readStoredAppTheme() ?? DEFAULT_APP_THEME);
  }, []);

  return null;
}
