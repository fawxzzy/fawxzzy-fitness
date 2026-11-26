// Live workout Pause (DESIGN-CONTRACT.md section 15.5). The in-progress workout has no tab bar and no left Back:
// the only ways out are Pause (top right) and Finish (dock). Pause leaves the workout running and returns to Today.
// Nothing is discarded or finished: logged sets are already saved or queued, and set drafts persist in the
// session draft store, so leaving with an exercise open loses nothing (that is why Pause no longer needs the old
// two-step "close the open exercise first" Back).
export const SESSION_PAUSE_LABEL = "Pause";
export const SESSION_PAUSE_ARIA_LABEL = "Pause workout and return to Today";
export const SESSION_PAUSE_FALLBACK_HREF = "/today";

function pathnameOf(href: string) {
  const end = href.search(/[?#]/);
  return end === -1 ? href : href.slice(0, end);
}

/** Where Pause goes: the screen's own Today return link (it may carry `?day=`), otherwise plain `/today`. */
export function resolveSessionPauseTarget(backHref?: string | null) {
  if (backHref && pathnameOf(backHref) === SESSION_PAUSE_FALLBACK_HREF) {
    return backHref;
  }
  return SESSION_PAUSE_FALLBACK_HREF;
}

/**
 * History back only when the previous in-app entry is Today itself (keeps Today's scroll and avoids stacking a second
 * Today entry); anything else (Routines, a deep link, a fresh tab) pushes Today, so Pause never lands elsewhere.
 */
export function shouldPauseUseHistoryBack(previousInAppPath: string | null | undefined) {
  return Boolean(previousInAppPath) && pathnameOf(previousInAppPath as string) === SESSION_PAUSE_FALLBACK_HREF;
}
