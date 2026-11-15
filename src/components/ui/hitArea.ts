/**
 * 44px hit area for an ISOLATED control whose visible shape is smaller (Copy/Share recap pills, inline text links, toast buttons).
 * Do not use it inside an overflow-x-auto rail (the rail clips the layer) or a wrapped row (the next row's layer overlaps the
 * row above); make those controls a real `min-h-11` instead.
 * The ::before layer is invisible and extends the tap target to 44px tall without moving layout;
 * `HIT_AREA_WIDE_CLASS_NAME` also widens it to 44px for controls narrower than that (DESIGN-CONTRACT section 11).
 */
export const HIT_AREA_CLASS_NAME =
  "relative before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-['']";
export const HIT_AREA_WIDE_CLASS_NAME =
  "relative before:absolute before:left-1/2 before:top-1/2 before:h-11 before:min-w-11 before:w-full before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']";
