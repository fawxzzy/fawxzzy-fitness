import { fitnessDesignPrimitiveClassNames } from "@/components/ui/app/designSystem";

// Legacy metrics for `AppHeader`/`SharedScreenHeader`, still used by detail screens until lane H1 moves them to
// `ScreenHeader`. Do not use on new screens.
export const headerTokens = {
  horizontalPadding: fitnessDesignPrimitiveClassNames.header.horizontalPadding,
  primaryRowGap: fitnessDesignPrimitiveClassNames.header.primaryRowGap,
  actionRailGap: fitnessDesignPrimitiveClassNames.header.actionRailGap,
  trailingSlot: fitnessDesignPrimitiveClassNames.header.trailingSlot,
  titleClassName: fitnessDesignPrimitiveClassNames.header.titleClassName,
  titleToSecondaryGap: fitnessDesignPrimitiveClassNames.header.titleToSecondaryGap,
  secondaryBlockGap: fitnessDesignPrimitiveClassNames.header.secondaryBlockGap,
  contentBottomGap: fitnessDesignPrimitiveClassNames.header.contentBottomGap,
  eyebrowClassName: fitnessDesignPrimitiveClassNames.header.eyebrowClassName,
  subtitleClassName: fitnessDesignPrimitiveClassNames.header.subtitleClassName,
  metaClassName: fitnessDesignPrimitiveClassNames.header.metaClassName,
  titleTextClassName: fitnessDesignPrimitiveClassNames.header.titleTextClassName,
} as const;

// Header metrics for every screen (DESIGN-CONTRACT.md section 15, "Header").
// `ScreenHeader` is the only consumer: screens never pass their own title size, padding or gap, and
// `tests/screen-header-contract.test.mjs` fails when a raw header title class shows up outside the component.
export const screenHeaderTokens = {
  // Same top padding under the tab bar / safe area and the same gap to the first card on every screen.
  root: "mx-auto w-full max-w-[calc(var(--content-max)+var(--screen-gutter)*2)] px-[var(--screen-gutter)] pb-3 pt-1",
  row: "flex min-h-11 min-w-0 items-center gap-2 px-1",
  // Back sits on the LEFT (detail screens only); 44x44 tap target.
  backSlot: "-ml-2 flex h-11 w-11 shrink-0 items-center justify-center",
  titleBlock: "min-w-0 flex-1",
  // One title style: left aligned, one line, ellipsis instead of wrapping off-screen.
  title: "truncate text-[1.375rem] font-semibold leading-7 tracking-[-0.02em] text-[rgb(var(--text-primary))]",
  // At most one muted, single-line subtitle in plain words.
  subtitle: "truncate text-sm leading-5 text-[rgb(var(--text-muted))]",
  // At most one 44x44 icon action or one chip.
  trailingSlot: "-mr-1 flex min-h-11 min-w-11 shrink-0 items-center justify-end",
  // The one header icon-button look (44x44, no border, no shadow, no glow). `!` beats the global
  // `button, [type="button"]` rule in globals.css, which otherwise adds a surface fill and a 1px ring.
  iconAction:
    "inline-flex h-11 w-11 items-center justify-center rounded-full !border-0 !bg-transparent text-[rgb(var(--text-secondary))] transition-colors hover:!bg-[rgb(var(--surface-2)/0.6)] hover:text-[rgb(var(--text-primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--button-primary-bg)/0.6)] aria-pressed:text-[rgb(var(--text-primary))]",
} as const;
