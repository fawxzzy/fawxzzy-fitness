// Gesture tuning for the swipe-to-reveal row. (The rail's old shell and slot class strings were unused and drew
// nothing: they read an undefined `--surface-2-soft` token, so they were removed in the F1 states sweep.)
export const swipeRailInteractionTokens = {
  mobileTrailingWidth: 112,
  desktopTrailingWidth: 208,
  pointerLockThreshold: 10,
  horizontalIntentThreshold: 20,
  horizontalIntentRatio: 1.35,
  openRatio: 0.62,
  closeRatioWhenOpen: 0.42,
  leadingOverscroll: 20,
} as const;
