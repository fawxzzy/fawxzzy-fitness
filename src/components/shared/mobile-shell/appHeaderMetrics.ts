// Header anchor variables for notices and banners (DESIGN-CONTRACT.md section 15, "Header anchor").
// MobileScreenShell measures its header block and writes two variables on <html>:
// - `--app-header-height`: distance from the top of the viewport to the bottom of the header block, safe area
//   included (title, subtitle and anything else in the header, e.g. History's segmented control).
// - `--app-header-menu-bottom`: distance from the top of the viewport to the bottom of the menu button, for
//   something that should sit just below the button rather than below the whole header.
// Both have :root fallbacks in globals.css, so a notice can use them before the first measurement.
export const APP_HEADER_HEIGHT_VAR = "--app-header-height";
export const APP_HEADER_MENU_BOTTOM_VAR = "--app-header-menu-bottom";
export const APP_HEADER_MENU_TOGGLE_SELECTOR = "[data-app-menu-toggle]";

type RectSource = { getBoundingClientRect(): { bottom: number } };
type HeaderNode = RectSource & { querySelector(selector: string): RectSource | null };
type StyleRoot = { style: { setProperty(name: string, value: string): void; removeProperty(name: string): void } };

export function measureAppHeader(node: HeaderNode): { headerBottom: number; menuBottom: number } {
  const headerBottom = Math.max(0, Math.ceil(node.getBoundingClientRect().bottom));
  const toggle = node.querySelector(APP_HEADER_MENU_TOGGLE_SELECTOR);
  const menuBottom = toggle ? Math.max(0, Math.ceil(toggle.getBoundingClientRect().bottom)) : headerBottom;
  return { headerBottom, menuBottom };
}

function defaultRoot(): StyleRoot | null {
  return typeof document === "undefined" ? null : document.documentElement;
}

export function syncAppHeaderMetrics(node: HeaderNode, root: StyleRoot | null = defaultRoot()) {
  if (!root) {
    return;
  }

  const { headerBottom, menuBottom } = measureAppHeader(node);
  root.style.setProperty(APP_HEADER_HEIGHT_VAR, `${headerBottom}px`);
  root.style.setProperty(APP_HEADER_MENU_BOTTOM_VAR, `${menuBottom}px`);
}

export function clearAppHeaderMetrics(root: StyleRoot | null = defaultRoot()) {
  root?.style.removeProperty(APP_HEADER_HEIGHT_VAR);
  root?.style.removeProperty(APP_HEADER_MENU_BOTTOM_VAR);
}
