export const themeContract = {
  bg: {
    app: "rgb(var(--bg-app))",
    panel: "rgb(var(--bg-panel))",
    card: "rgb(var(--bg-card))",
    shell: "rgb(var(--shell-rgb))",
    panelSoft: "rgb(var(--surface)/0.76)",
    cardSoft: "rgb(var(--surface-rgb)/0.46)",
  },
  stroke: {
    soft: "rgb(var(--border)/0.26)",
    strong: "rgb(var(--border-strong)/0.48)",
  },
  text: {
    primary: "rgb(var(--text-primary))",
    secondary: "rgb(var(--text-secondary))",
    muted: "rgb(var(--text-muted))",
  },
  accent: {
    mint: "rgb(var(--accent-mint))",
    blue: "rgb(var(--accent-blue))",
    yellowOff: "rgb(var(--accent-yellow-off))",
    yellowOn: "rgb(var(--accent-yellow-on))",
    red: "rgb(var(--accent-red))",
    purple: "rgb(var(--accent-purple))",
  },
  radii: {
    panel: "1.125rem",
    card: "1rem",
    button: "0.875rem",
    pill: "999px",
  },
  spacing: {
    cardPad: "0.875rem",
    sectionGap: "0.75rem",
  },
} as const;

export const tokens = {
  colors: {
    bgApp: themeContract.bg.app,
    bgPanel: themeContract.bg.panel,
    bgCard: themeContract.bg.cardSoft,
    bgCardElevated: "rgb(var(--surface-rgb)/0.6)",
    borderSubtle: themeContract.stroke.soft,
    borderStrong: themeContract.stroke.strong,
    textPrimary: themeContract.text.primary,
    textSecondary: themeContract.text.secondary,
    textMuted: themeContract.text.muted,
    accentGreen: themeContract.accent.mint,
    accentBlue: themeContract.accent.blue,
    dangerRed: themeContract.accent.red,
  },
  radii: themeContract.radii,
  spacing: themeContract.spacing,
} as const;

export type Tokens = typeof tokens;
