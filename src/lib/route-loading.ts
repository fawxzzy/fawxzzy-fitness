export type RouteLoadingVariant = "boot" | "route";

export const ROUTE_LOADING_DELAY_MS = 260;
export const INITIAL_EXPERIENCE_LOADING_VARIANT: RouteLoadingVariant = "boot";

export function getRouteLoadingDelayMs(variant: RouteLoadingVariant) {
  return variant === "boot" ? 0 : ROUTE_LOADING_DELAY_MS;
}

export function shouldHideRouteLoadingChrome(variant: RouteLoadingVariant, isVisible: boolean) {
  return variant === "boot" || isVisible;
}
