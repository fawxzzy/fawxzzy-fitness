// Open logger reveal (wave 2 review of PR #322, 2026-11-26).
//
// On a short phone (320x568) the open logger's Log set row sat under the Add / Finish dock, which floats over the
// bottom of the scroll area. After the row anchor runs, scroll just enough that Log set clears the dock, but never so
// far that the logger box itself (its Set row / Last time line) slides above the top of the scroll area.

/** Extra pixels the scroll area should move down so Log set clears the dock. 0 when it already shows. */
export function getLoggerRevealShift(args: {
  actionsBottom: number;
  panelTop: number;
  visibleTop: number;
  visibleBottom: number;
  marginPx?: number;
}): number {
  const margin = args.marginPx ?? 8;
  const overflow = args.actionsBottom + margin - args.visibleBottom;
  if (overflow <= 0) {
    return 0;
  }
  const room = args.panelTop - (args.visibleTop + margin);
  return Math.max(0, Math.min(overflow, room));
}
