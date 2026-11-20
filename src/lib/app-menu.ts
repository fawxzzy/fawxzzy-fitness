// Pure logic for the top-right app menu (DESIGN-CONTRACT.md section 15, "App menu").
// No React here so the active-route and keyboard rules can be unit tested on their own.

export type AppMenuDestination = {
  href: string;
  label: string;
};

// The four destinations, in menu order. `/account` is a pushed detail screen of Settings, so Settings stays
// highlighted there; nothing in the menu leaves the app.
export const APP_MENU_DESTINATIONS: readonly AppMenuDestination[] = [
  { href: "/today", label: "Today" },
  { href: "/routines", label: "Routines" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
] as const;

const SETTINGS_ALIASES = ["/account"] as const;

function matchesPrefix(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The destination that should read as "you are here", or null on a screen that is not one of the four. */
export function resolveActiveMenuHref(
  pathname: string | null | undefined,
  destinations: readonly AppMenuDestination[] = APP_MENU_DESTINATIONS,
): string | null {
  if (!pathname) {
    return null;
  }

  for (const destination of destinations) {
    if (matchesPrefix(pathname, destination.href)) {
      return destination.href;
    }
  }

  if (SETTINGS_ALIASES.some((alias) => matchesPrefix(pathname, alias))) {
    return destinations.some((destination) => destination.href === "/settings") ? "/settings" : null;
  }

  return null;
}

export type MenuKey = "ArrowDown" | "ArrowUp" | "Home" | "End" | "Tab" | "ShiftTab";

/**
 * Where focus goes next inside the open menu. Arrow keys and Tab wrap around (a focus trap: Tab never leaves the
 * open panel), Home/End jump to the ends. `current` of -1 means focus is on the toggle button or nowhere yet.
 */
export function nextMenuFocusIndex(current: number, key: MenuKey, count: number): number {
  if (count <= 0) {
    return -1;
  }

  switch (key) {
    case "Home":
      return 0;
    case "End":
      return count - 1;
    case "ArrowDown":
    case "Tab":
      return current < 0 || current >= count - 1 ? 0 : current + 1;
    case "ArrowUp":
    case "ShiftTab":
      return current <= 0 ? count - 1 : current - 1;
    default:
      return current;
  }
}

/** Open/close timings, matched to Mazer's menu (open 180ms, close 140ms) and DESIGN-CONTRACT.md section 7. */
export const APP_MENU_OPEN_MS = 180;
export const APP_MENU_CLOSE_MS = 140;
