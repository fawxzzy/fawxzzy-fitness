/**
 * Route-loading vocabulary. Timing no longer lives here: the show delay, minimum hold and fades are the one app
 * loader timeline (src/lib/app-loader.ts), run by the single <AppLoaderHost>; no route arms its own timer.
 */
export type RouteLoadingVariant = "boot" | "route";

/** The entry gate's loading screen (InitialExperienceGate). Same loader, same timing as every other wait. */
export const INITIAL_EXPERIENCE_LOADING_VARIANT: RouteLoadingVariant = "boot";

/** Diagnostics only (src/lib/loading-diagnostics.ts): how long a gate may stay pending before it is reported slow. */
export const BOOT_LOADING_DIAGNOSTIC_TIMEOUT_MS = 5000;
export const ROUTE_LOADING_DIAGNOSTIC_TIMEOUT_MS = 3500;

export function getRouteLoadingDiagnosticTimeoutMs(variant: RouteLoadingVariant) {
  return variant === "boot" ? BOOT_LOADING_DIAGNOSTIC_TIMEOUT_MS : ROUTE_LOADING_DIAGNOSTIC_TIMEOUT_MS;
}
