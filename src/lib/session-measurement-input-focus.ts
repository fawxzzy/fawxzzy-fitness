// Guards the "keep the focused measurement input visible above the mobile
// keyboard" behavior in SessionTimers.tsx's SetLoggerCard. Both the initial
// focus handler and the visualViewport resize (keyboard open/close) handler
// call this before invoking `scrollIntoView`, so a stale/blurred reference
// never re-scrolls the page out from under the user.
//
// Pure and DOM-agnostic on purpose: it only ever compares identity between
// `document.activeElement` and the input this component last focused, so it
// can be unit tested without a real DOM.
export function isTrackedMeasurementInputStillFocused(
  activeElement: EventTarget | null | undefined,
  trackedElement: EventTarget | null | undefined,
): boolean {
  return trackedElement != null && activeElement === trackedElement;
}
