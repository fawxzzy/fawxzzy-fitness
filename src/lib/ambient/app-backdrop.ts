/**
 * App backdrop layer: a static, token-only background drawn behind app screens (CSS gradients and one tiny inline
 * SVG mask, no images, no animation, no layout). It replaces the animated ambient scene on the screens that opt in;
 * Today is the first. Three looks exist so they can be compared on /dev/today-backgrounds; the default ships.
 *
 *   aurora:  two soft accent/cyan glows over the base gradient. Calm depth, nothing that reads as a glyph.
 *   grid:    a faint dot grid fading out from the top, plus a small top glow.
 *   contour: thin topographic wave lines, masked so they fade toward the bottom.
 */
export const APP_BACKDROP_VARIANTS = ["aurora", "grid", "contour"] as const;
export type AppBackdropVariant = (typeof APP_BACKDROP_VARIANTS)[number];

/** Today's backdrop (Zac 2026-11-19 lane D). Reasoning lives in docs/design-system/DESIGN-CONTRACT.md section 2. */
export const TODAY_APP_BACKDROP_VARIANT: AppBackdropVariant = "aurora";

/** Short dev aliases (`?backdrop=a|b|c`) used by the preview route, plus the full names. */
const DEV_ALIASES: Record<string, AppBackdropVariant> = {
  a: "aurora",
  b: "grid",
  c: "contour",
};

export function parseAppBackdropVariant(value: string | null | undefined): AppBackdropVariant | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return null;
  if (Object.hasOwn(DEV_ALIASES, normalized)) return DEV_ALIASES[normalized];
  return (APP_BACKDROP_VARIANTS as readonly string[]).includes(normalized) ? (normalized as AppBackdropVariant) : null;
}

/**
 * Backdrop for a /dev/mobile-regression request. Today scenarios get Today's backdrop (so the preview matches
 * production /today); an explicit `backdrop` picks one of the three; `backdrop=ambient` keeps the animated scene.
 */
export function resolveDevRegressionBackdrop(params: {
  scenario?: string;
  screen?: string;
  backdrop?: string;
}): AppBackdropVariant | null {
  if (params.backdrop?.trim().toLowerCase() === "ambient") return null;
  const explicit = parseAppBackdropVariant(params.backdrop);
  if (explicit) return explicit;
  const isToday = params.screen === "today" || (params.scenario?.startsWith("today-") ?? false);
  return isToday ? TODAY_APP_BACKDROP_VARIANT : null;
}

/** Which backdrop a production route gets; null keeps the animated ambient scene. Only Today opts in so far. */
export function resolveAppBackdropForPathname(pathname: string | null): AppBackdropVariant | null {
  if (!pathname) return null;
  return pathname === "/today" || pathname.startsWith("/today/") ? TODAY_APP_BACKDROP_VARIANT : null;
}
