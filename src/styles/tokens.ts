export const themeContract = {
  bg: {
    app: "rgb(var(--bg-app))",
    panel: "rgb(var(--surface) / 0.88)",
    card: "rgb(var(--surface-2) / 0.94)",
    shell: "rgb(var(--shell-rgb) / 0.98)",
    panelSoft: "rgb(var(--surface) / 0.88)",
    cardSoft: "rgb(var(--surface-rgb) / 0.78)",
  },
  stroke: {
    soft: "rgb(var(--border) / 0.12)",
    strong: "rgb(var(--border-strong) / 0.22)",
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
    panel: "var(--radius-lg)",
    card: "var(--radius-lg)",
    button: "var(--button-radius)",
    pill: "999px",
  },
  spacing: {
    cardPad: "1rem",
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
