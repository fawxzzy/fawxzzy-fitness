"use client";

import { useCallback, useEffect, useState } from "react";

export type GlassEffectsMode = "on" | "reduced" | "off";

const STORAGE_KEY = "glass-effects";

function isGlassEffectsMode(value: string | null): value is GlassEffectsMode {
  return value === "on" || value === "reduced" || value === "off";
}

function resolveDefaultMode(): GlassEffectsMode {
  if (typeof window === "undefined") {
    return "on";
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "on";
}

function applyModeToDocument(mode: GlassEffectsMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.glassEffects = mode;
}

export function useGlassEffects() {
  const [mode, setMode] = useState<GlassEffectsMode>("on");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const initialMode = isGlassEffectsMode(saved) ? saved : resolveDefaultMode();

    setMode(initialMode);
    applyModeToDocument(initialMode);
  }, []);

  const setGlassMode = useCallback((nextMode: GlassEffectsMode) => {
    setMode(nextMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    }
    applyModeToDocument(nextMode);
  }, []);

  return { mode, setMode: setGlassMode };
}
