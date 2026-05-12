import type { CSSProperties } from "react";

export const selectionChromeStyle = {
  "--action-chrome-border-color": "rgb(var(--selection-rgb) / 0.3)",
  "--action-chrome-border-color-hover": "rgb(var(--selection-rgb) / 0.36)",
  "--action-chrome-text-color": "rgb(var(--text-primary) / 0.96)",
  "--action-chrome-overlay-top": "rgb(var(--selection-rgb) / 0.05)",
  "--action-chrome-overlay-bottom": "rgb(var(--selection-rgb) / 0.012)",
  "--action-chrome-overlay-top-hover": "rgb(var(--selection-rgb) / 0.07)",
  "--action-chrome-overlay-bottom-hover": "rgb(var(--selection-rgb) / 0.02)",
  "--action-chrome-overlay-top-active": "rgb(var(--selection-rgb) / 0.09)",
  "--action-chrome-overlay-bottom-active": "rgb(var(--selection-rgb) / 0.03)",
  "--action-chrome-shadow": "inset 0 0 0 1px rgb(var(--selection-rgb) / 0.16), 0 0 0 1px rgb(var(--selection-rgb) / 0.05), 0 0 16px rgb(var(--selection-rgb) / 0.12), 0 12px 24px rgba(0, 0, 0, 0.16)",
  "--action-chrome-shadow-hover": "inset 0 0 0 1px rgb(var(--selection-rgb) / 0.2), 0 0 0 1px rgb(var(--selection-rgb) / 0.08), 0 0 20px rgb(var(--selection-rgb) / 0.16), 0 12px 24px rgba(0, 0, 0, 0.18)",
  "--action-chrome-shadow-active": "inset 0 0 0 1px rgb(var(--selection-rgb) / 0.22), 0 0 0 1px rgb(var(--selection-rgb) / 0.1), 0 0 22px rgb(var(--selection-rgb) / 0.18), 0 12px 24px rgba(0, 0, 0, 0.18)",
} as CSSProperties;
