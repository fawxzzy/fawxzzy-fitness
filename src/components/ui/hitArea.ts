/**
 * 44px hit area for a control whose visible shape is smaller (pills, compact text buttons).
 * The ::before layer is invisible and extends the tap target to 44px tall without moving layout;
 * `HIT_AREA_WIDE_CLASS_NAME` also widens it to 44px for controls narrower than that (DESIGN-CONTRACT section 11).
 */
export const HIT_AREA_CLASS_NAME =
  "relative before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-['']";
export const HIT_AREA_WIDE_CLASS_NAME =
  "relative before:absolute before:left-1/2 before:top-1/2 before:h-11 before:min-w-11 before:w-full before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']";
