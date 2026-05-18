export type RouteLoadingVariant = "boot" | "route";

export const ROUTE_LOADING_DELAY_MS = 420;
export const BOOT_LOADING_DELAY_MS = 220;
export const INITIAL_EXPERIENCE_LOADING_VARIANT: RouteLoadingVariant = "boot";

export function getRouteLoadingDelayMs(variant: RouteLoadingVariant) {
  return variant === "boot" ? BOOT_LOADING_DELAY_MS : ROUTE_LOADING_DELAY_MS;
}

export function shouldHideRouteLoadingChrome(variant: RouteLoadingVariant, isVisible: boolean) {
  return variant === "boot" || isVisible;
}
