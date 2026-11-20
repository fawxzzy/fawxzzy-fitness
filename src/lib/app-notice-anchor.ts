// Floating notices (toasts) anchor top-right, just under the screen's header row (DESIGN-CONTRACT C16).
// The header row is not a fixed height (safe area, title wrap, the header menu button), so the shell measures it and
// publishes the result as `--app-notice-top` on <html>; the toast stack reads only that variable.

export const APP_NOTICE_TOP_VAR = "--app-notice-top";
/** Mark the element whose bottom edge notices should sit under (e.g. the header row that holds the menu button). */
export const APP_NOTICE_ANCHOR_ATTRIBUTE = "data-app-notice-anchor";
export const APP_NOTICE_ANCHOR_GAP_PX = 8;

type RectLike = { bottom: number; height: number } | null | undefined;

/**
 * Picks the header edge to anchor under: an explicit `[data-app-notice-anchor]` element first, then the floating
 * header, then the top chrome. Elements with no height (unmounted, display:none) are skipped. Returns the notice
 * stack top in CSS px, or null when there is nothing to anchor to (the CSS fallback then applies).
 */
export function computeNoticeAnchorTop(
  { anchor, floatingHeader, topChrome }: { anchor?: RectLike; floatingHeader?: RectLike; topChrome?: RectLike },
  gapPx: number = APP_NOTICE_ANCHOR_GAP_PX,
): number | null {
  for (const rect of [anchor, floatingHeader, topChrome]) {
    if (rect && Number.isFinite(rect.bottom) && rect.height > 0 && rect.bottom > 0) {
      return Math.round(rect.bottom + gapPx);
    }
  }
  return null;
}
