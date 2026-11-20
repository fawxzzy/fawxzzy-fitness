const SAFE_PATH_BASE_ORIGIN = "https://app.invalid";
// Backslash (browsers read it as "/"), ASCII control chars + space, DEL..NBSP, and Unicode whitespace/format chars.
const UNSAFE_CODE_POINT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x5c, 0x5c], // backslash
  [0x00, 0x20], // C0 controls (tab, LF, CR, NUL...) and space
  [0x7f, 0xa0], // DEL, C1 controls, no-break space
  [0x1680, 0x1680],
  [0x180e, 0x180e],
  [0x2000, 0x200f], // en/em/thin spaces, zero-width chars, direction marks
  [0x2028, 0x2029], // line/paragraph separators
  [0x202f, 0x202f],
  [0x205f, 0x2060],
  [0x3000, 0x3000], // ideographic space
  [0xfeff, 0xfeff], // BOM / zero-width no-break space
];

function containsUnsafePathCharacter(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (UNSAFE_CODE_POINT_RANGES.some(([start, end]) => code >= start && code <= end)) {
      return true;
    }
  }
  return false;
}
// How many extra percent-decoding layers are inspected (callers such as decodeReturnTo decode once more).
const MAX_DECODE_LAYERS = 3;

function getPathPart(value: string) {
  const end = value.search(/[?#]/);
  return end === -1 ? value : value.slice(0, end);
}

function isSameOriginAppPathLayer(layer: string, checkWholeValue: boolean) {
  if (!layer.startsWith("/") || layer.startsWith("//")) {
    return false;
  }

  // Raw values may not carry unsafe characters anywhere; decoded layers only matter up to the query/hash,
  // so an encoded space inside a query value (e.g. ?q=bench%20press) stays allowed.
  if (containsUnsafePathCharacter(checkWholeValue ? layer : getPathPart(layer))) {
    return false;
  }

  try {
    const resolved = new URL(layer, SAFE_PATH_BASE_ORIGIN);
    return resolved.origin === SAFE_PATH_BASE_ORIGIN && !resolved.pathname.startsWith("//");
  } catch {
    return false;
  }
}

/**
 * True only for a same-origin, in-app absolute path ("/today", "/routines/1/edit?x=1#y").
 * Rejects protocol-relative ("//host"), backslash ("/\host"), control/whitespace ("/\t/host"),
 * absolute URLs and schemes, and values that turn into any of those after percent-decoding
 * (up to MAX_DECODE_LAYERS layers, so "/%5Chost" and "/%252F%252Fhost" are rejected too).
 */
export function isSafeAppPath(value: string | null | undefined): value is string {
  if (typeof value !== "string" || !isSameOriginAppPathLayer(value, true)) {
    return false;
  }

  let layer = value;
  for (let depth = 0; depth < MAX_DECODE_LAYERS; depth += 1) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(layer);
    } catch {
      return false;
    }

    if (decoded === layer) {
      return true;
    }

    if (!isSameOriginAppPathLayer(decoded, false)) {
      return false;
    }

    layer = decoded;
  }

  // Still changing after MAX_DECODE_LAYERS decodes: treat deep encoding as hostile.
  try {
    return decodeURIComponent(layer) === layer;
  } catch {
    return false;
  }
}

export function resolveReturnHref(rawReturnTo: string | null | undefined, fallbackHref: string): string {
  return isSafeAppPath(rawReturnTo) ? rawReturnTo : fallbackHref;
}

export function resolvePreferredReturnHref(options: {
  requestedReturnTo?: string | null;
  currentPath: string;
  stack: string[];
  fallbackHref?: string;
}) {
  const requestedReturnTo = isSafeAppPath(options.requestedReturnTo) ? options.requestedReturnTo : null;
  if (requestedReturnTo && requestedReturnTo !== options.currentPath) {
    return requestedReturnTo;
  }

  return getSafeReturnContract(options.currentPath, options.stack, options.fallbackHref).returnHref;
}

export function getSafeReturnContract(currentPath: string, stack: string[], fallbackHref?: string) {
  const isCurrentStackTail = stack[stack.length - 1] === currentPath;
  const previousEntry = isCurrentStackTail ? stack[stack.length - 2] : null;
  const historyHref = isSafeAppPath(previousEntry) ? previousEntry : null;
  const fallbackReturnHref = isSafeAppPath(fallbackHref) ? fallbackHref : null;

  return {
    historyHref,
    fallbackReturnHref,
    returnHref: historyHref ?? fallbackReturnHref,
    useHistoryBack: Boolean(historyHref),
  };
}
