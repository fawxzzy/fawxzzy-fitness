import {
  type CardSemanticTone,
  cardAccentRailClassNames,
  cardShellToneClassNames,
} from "@/components/cardSemanticTones";

/**
 * Card-system tokens: the single source for card chrome (see docs/design-system/CARD-SYSTEM.md).
 * Colours always come from theme CSS variables and the radius from `--card-radius`, so every theme
 * (default, rose, test, custom slots) restyles cards without per-card overrides.
 */
export type CardTone = CardSemanticTone;

export const cardTokens = {
  /** Glass surface identical to Glass `base`, flat inside lists (no drop shadow). Radius comes from the theme through the glass radius variable, so no radius utility can conflict. */
  surface:
    "glass-surface glass-sheen relative isolate w-full min-w-0 text-left text-[rgb(var(--text-primary))] shadow-none [--glass-blur:var(--glass-current-blur-base)] [--glass-radius:var(--card-radius)]",
  surfaceDashed: "border-dashed",
  /** 4px status rail on the leading edge; paired with a visible text chip, never colour alone. */
  rail: "pointer-events-none absolute bottom-px left-px top-px z-[2] w-1 rounded-r-full",
  /** Header row: leading control, text block, trailing controls. */
  headerRow: "relative flex min-w-0 items-center gap-1 px-1.5 py-1",
  /** Leading slot is decorative media only (thumbnail): clicks fall through to the stretched header button. Controls live in the trailing slot. */
  headerLeading: "pointer-events-none relative flex shrink-0 items-center pl-1.5",
  headerTrailing: "relative z-10 flex shrink-0 items-center gap-0.5",
  headerMain: "min-w-0 flex-1 px-2.5 py-2.5",
  /** Stretched button: the whole header is one 44px+ target while controls stay separate siblings. */
  headerHit:
    "absolute inset-0 z-0 block h-full w-full rounded-[inherit] !border-0 !bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(var(--accent)/0.5)] disabled:cursor-not-allowed",
  title:
    "m-0 min-w-0 text-base font-semibold leading-snug tracking-[-0.01em] text-[rgb(var(--text-primary))] [text-wrap:balance] [overflow-wrap:anywhere]",
  titleSecondary: "ml-1.5 text-sm font-medium text-[rgb(var(--text-secondary)/0.92)]",
  // The meta line wraps. Each item carries its own leading dot, drawn in 12px of left padding that the wrapper
  // pulls outside the line box (-ml-3) and the paragraph clips (overflow-hidden), so a dot never ends a line or
  // starts the next one.
  meta: "m-0 min-w-0 overflow-hidden text-xs font-medium leading-snug text-[rgb(var(--text-secondary)/0.92)]",
  metaWrap: "-ml-3 flex min-w-0 flex-wrap gap-y-0.5",
  metaItem: "relative min-w-0 pl-3",
  metaSeparator: "pointer-events-none absolute left-[3px] select-none text-[rgb(var(--text-muted)/0.9)]",
  chips: "flex min-w-0 flex-wrap items-center gap-1.5",
  body: "px-4 pb-3",
  /**
   * The global `button` rule in globals.css is unlayered and out-ranks plain utilities for background, border
   * and colour, so card controls restate those three with `!`. This is the only place that has to.
   */
  iconControl:
    "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full !border !border-[rgb(var(--border-strong)/0.18)] !bg-[rgb(var(--surface-3-rgb)/0.4)] !text-[rgb(var(--text-secondary)/0.98)] transition-colors hover:!text-[rgb(var(--text-primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.5)] disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 motion-reduce:transition-none",
  iconControlActive: "!border-[rgb(var(--selection-rgb)/0.5)] !bg-[rgb(var(--selection-rgb)/0.18)] !text-[rgb(var(--text-primary))] ring-2 ring-[rgb(var(--selection-rgb)/0.4)]",
  affordance: "pointer-events-none flex h-11 w-7 shrink-0 items-center justify-center text-[rgb(var(--text-muted)/0.95)]",
  statLabel: "text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-[rgb(var(--text-muted)/0.98)]",
  statValue: "text-sm font-semibold leading-snug text-[rgb(var(--text-primary))]",
  list: "m-0 flex list-none flex-col gap-2 p-0",
} as const;

export function resolveCardToneClassNames(tone: CardTone) {
  return {
    rail: cardAccentRailClassNames[tone],
    shell: cardShellToneClassNames[tone],
  };
}
