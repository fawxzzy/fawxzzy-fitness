const SAFE_PATH_BASE_ORIGIN = "https://app.invalid";
const ASCII_SPACE = 0x20;
// Characters that can move a URL off-origin or that no in-app path needs: backslash (browsers read it as "/"),
// C0 controls (tab/LF/CR are deleted by URL parsers, so "/<TAB>/host" becomes "//host"), DEL, C1 controls,
// no-break space and Unicode whitespace/format characters. Plain ASCII space is handled separately: inside a
// path segment or query it is percent-encoded by the URL parser and cannot change the origin.
const UNSAFE_CODE_POINT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x5c, 0x5c], // backslash
  [0x00, 0x1f], // C0 controls (tab, LF, CR, NUL...)
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
// Decoding stops once a layer no longer changes; this only bounds pathological input.
const MAX_DECODE_LAYERS = 16;

function containsUnsafePathCharacter(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (UNSAFE_CODE_POINT_RANGES.some(([start, end]) => code >= start && code <= end)) {
      return true;
    }
  }
  return false;
}

function getPathPart(value: string) {
  const end = value.search(/[?#]/);
  return end === -1 ? value : value.slice(0, end);
}

function isSameOriginAppPathLayer(layer: string, checkWholeValue: boolean) {
  if (!layer.startsWith("/") || layer.startsWith("//")) {
    return false;
  }

  // A space straight after the leading slash ("/ /host") is the one place a lenient parser could treat
  // whitespace as part of a separator; anywhere else ("/x/Bench Press", "?q=bench press") it is inert.
  if (layer.charCodeAt(1) === ASCII_SPACE) {
    return false;
  }

  // Raw values may not carry unsafe characters anywhere; decoded layers only matter up to the query/hash.
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

// When a decoded layer is no longer valid percent-encoding (e.g. "?q=100%" from "?q=100%25"), a strict
// decodeURIComponent throws; a lenient decoder elsewhere could still decode the ASCII escapes it contains,
// so those (the only ones that can form "/" or "\" separators) are decoded and checked too.
function decodeLayer(layer: string) {
  try {
    return decodeURIComponent(layer);
  } catch {
    return layer.replace(/%([0-7][0-9a-fA-F])/g, (_match, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  }
}

/**
 * True only for a same-origin, in-app absolute path ("/today", "/routines/1/edit?x=1#y").
 * Rejects protocol-relative ("//host"), backslash ("/\host"), control/Unicode whitespace ("/<TAB>/host"),
 * absolute URLs and schemes, malformed raw percent escapes, and values that turn into any of those after
 * any number of percent-decoding passes ("/%5Chost", "/%252F%252Fhost"), because callers such as
 * decodeReturnTo decode again. Well-formed escapes that decode to inert characters stay allowed
 * ("/history?q=100%25", "/x/Bench%20Press", deeply nested encoded returnTo values).
 */
export function isSafeAppPath(value: string | null | undefined): value is string {
  if (typeof value !== "string" || !isSameOriginAppPathLayer(value, true)) {
    return false;
  }

  try {
    decodeURIComponent(value);
  } catch {
    return false;
  }

  let layer = value;
  for (let depth = 0; depth < MAX_DECODE_LAYERS; depth += 1) {
    const decoded = decodeLayer(layer);
    if (decoded === layer) {
      return true;
    }

    if (!isSameOriginAppPathLayer(decoded, false)) {
      return false;
    }

    layer = decoded;
  }

  return false;
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
