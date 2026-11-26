// Pure rules for the bottom tab bar (docs/mobile-shell-contract.md "Bottom tab bar", DESIGN-CONTRACT.md 15.6).
// No React here: the destinations, the active tab, WHERE the bar shows and the keyboard rule are unit tested on
// their own (src/lib/app-tabs.test.ts). `AppTabBar` only renders what these functions decide.

export type AppTabDestination = {
  href: string;
  label: string;
};

// The four tabs, in bar order. Nothing in the bar leaves the app.
export const APP_TAB_DESTINATIONS: readonly AppTabDestination[] = [
  { href: "/today", label: "Today" },
  { href: "/routines", label: "Routines" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
] as const;

// `/account` is a pushed detail screen of Settings, so the Settings tab stays highlighted there.
export const SETTINGS_ALIASES = ["/account"] as const;

function matchesPrefix(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Path without query, hash or trailing slash ("/today/?x=1" -> "/today"); "" for nothing. */
export function normalizeAppPath(pathname: string | null | undefined): string {
  if (!pathname) return "";
  const bare = pathname.split(/[?#]/u)[0] ?? "";
  if (bare === "/") return "/";
  return bare.replace(/\/+$/u, "");
}

/** The tab that should read as "you are here", or null on a screen that belongs to none of the four. */
export function resolveActiveTabHref(
  pathname: string | null | undefined,
  destinations: readonly AppTabDestination[] = APP_TAB_DESTINATIONS,
): string | null {
  const path = normalizeAppPath(pathname);
  if (!path) return null;

  for (const destination of destinations) {
    if (matchesPrefix(path, destination.href)) {
      return destination.href;
    }
  }

  if (SETTINGS_ALIASES.some((alias) => matchesPrefix(path, alias))) {
    return destinations.some((destination) => destination.href === "/settings") ? "/settings" : null;
  }

  return null;
}

/**
 * What kind of screen a route is, for the tab bar:
 * - "tab": one of the four roots.
 * - "child": a read-only screen pushed from a root (routine home, Days library, a History sub-view or session,
 *   Account). The bar stays so the user can always jump section.
 * - "workout": the live workout (`/session/*`). It owns the whole screen and its own dock.
 * - "flow": an editor, form or picker with its own bottom dock (create / edit routine, edit day, add exercise,
 *   new day). Leaving it by a tab would drop unsaved input, so there is no bar.
 * - "outside": everything else, signed out or full screen: auth, entry, install, onboarding, legal pages, the
 *   offline page, `/dev/*` and unknown routes. Unknown routes fail closed (no bar).
 */
export type AppRouteKind = "tab" | "child" | "workout" | "flow" | "outside";

const TAB_ROOTS = new Set(APP_TAB_DESTINATIONS.map((destination) => destination.href));
const ROUTINE_FLOW_CHILDREN = new Set(["new"]);
const ROUTINE_HOME_FLOW_SEGMENTS = new Set(["edit", "new-day", "new-workout-plan", "days"]);

export function classifyAppRoute(pathname: string | null | undefined): AppRouteKind {
  const path = normalizeAppPath(pathname);
  if (!path) return "outside";
  if (TAB_ROOTS.has(path)) return "tab";

  const segments = path.split("/").filter(Boolean);
  const [section, child, grandchild] = segments;

  if (section === "session") return "workout";

  if (section === "account" && segments.length === 1) return "child";

  if (section === "history" && segments.length === 2) {
    // /history/exercises, /history/progression and /history/<sessionId> are all read views.
    return "child";
  }

  if (section === "routines" && child) {
    if (segments.length === 2) {
      return ROUTINE_FLOW_CHILDREN.has(child) ? "flow" : "child";
    }
    if (grandchild && ROUTINE_HOME_FLOW_SEGMENTS.has(grandchild)) {
      return "flow";
    }
  }

  return "outside";
}

export type AppTabBarVisibilityInput = {
  pathname: string | null | undefined;
  /**
   * A screen that stays on its route but switches into an editor (History session "Edit": Cancel / Save dock)
   * hides the bar while it edits, the same as a flow route.
   */
  suppressed?: boolean;
  /** The layout viewport is squeezed by an on-screen keyboard (see `isKeyboardSqueezingLayout`). */
  keyboardOpen?: boolean;
};

/** THE tab-bar visibility rule: shown on tab roots and their read-only children, hidden everywhere else. */
export function resolveAppTabBarVisibility({ pathname, suppressed = false, keyboardOpen = false }: AppTabBarVisibilityInput): boolean {
  if (suppressed || keyboardOpen) return false;
  const kind = classifyAppRoute(pathname);
  return kind === "tab" || kind === "child";
}

/** `/dev/*` routes never show the real bar unless a fixture asks for a preview (see `resolveAppTabBarPath`). */
export function isDevPath(pathname: string | null | undefined): boolean {
  const path = normalizeAppPath(pathname);
  return path === "/dev" || path.startsWith("/dev/");
}

/**
 * The path the bar decides on. A `/dev` fixture can stand in for a product route (the mobile-regression screens
 * preview the bar exactly as its product route would show it); a preview never applies outside `/dev`.
 */
export function resolveAppTabBarPath(pathname: string | null | undefined, previewPathname: string | null | undefined): string {
  const path = normalizeAppPath(pathname);
  if (previewPathname && isDevPath(path)) {
    return normalizeAppPath(previewPathname);
  }
  return path;
}

/** How much the layout viewport must shrink, with a text field focused, to count as an on-screen keyboard. */
export const KEYBOARD_SQUEEZE_THRESHOLD_PX = 150;

/**
 * True when the browser resizes the LAYOUT viewport for the keyboard (Android "resizes-content" browsers). Then an
 * in-flow bar would ride up on top of the keyboard, so it hides. Modern iOS Safari and Chrome keep the layout size
 * (the keyboard only covers it) and this stays false: hiding on focus alone would make the page jump.
 */
export function isKeyboardSqueezingLayout({
  baselineHeight,
  currentHeight,
  editableFocused,
}: {
  baselineHeight: number;
  currentHeight: number;
  editableFocused: boolean;
}): boolean {
  if (!editableFocused) return false;
  if (!Number.isFinite(baselineHeight) || !Number.isFinite(currentHeight) || baselineHeight <= 0) return false;
  return baselineHeight - currentHeight > KEYBOARD_SQUEEZE_THRESHOLD_PX;
}
