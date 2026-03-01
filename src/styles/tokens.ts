export const tokens = {
  colors: {
    bgApp: "rgb(var(--bg))",
    bgCard: "rgb(var(--bg)/0.38)",
    bgCardElevated: "rgb(var(--bg)/0.55)",
    borderSubtle: "rgb(var(--border)/0.45)",
    textPrimary: "rgb(var(--text))",
    textMuted: "rgb(var(--text)/0.62)",
    accentGreen: "rgb(var(--accent))",
    dangerRed: "rgb(220 38 38)",
  },
  radii: {
    card: "0.75rem",
    pill: "999px",
    button: "0.625rem",
  },
  spacing: {
    cardPad: "0.75rem",
    sectionGap: "0.625rem",
  },
} as const;

export type Tokens = typeof tokens;
