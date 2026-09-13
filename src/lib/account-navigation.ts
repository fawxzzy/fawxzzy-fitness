const FITNESS_LOCAL_ORIGIN = "https://fitness.local";
const ACCOUNT_PATH = "/account";
export const DEFAULT_ACCOUNT_RETURN_HREF = "/settings";

function containsUnsafeNavigationCharacter(value: string) {
  try {
    return /[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(value));
  } catch {
    return true;
  }
}

export function resolveAccountReturnHref(rawReturnTo: string | null | undefined) {
  if (!rawReturnTo || !rawReturnTo.startsWith("/") || rawReturnTo.startsWith("//") || containsUnsafeNavigationCharacter(rawReturnTo)) {
    return DEFAULT_ACCOUNT_RETURN_HREF;
  }

  try {
    const resolved = new URL(rawReturnTo, FITNESS_LOCAL_ORIGIN);
    if (
      resolved.origin !== FITNESS_LOCAL_ORIGIN
      || resolved.pathname.startsWith("//")
      || resolved.pathname === ACCOUNT_PATH
    ) {
      return DEFAULT_ACCOUNT_RETURN_HREF;
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return DEFAULT_ACCOUNT_RETURN_HREF;
  }
}

export function getAccountRouteHref(returnTo = DEFAULT_ACCOUNT_RETURN_HREF) {
  const resolvedReturnTo = resolveAccountReturnHref(returnTo);
  return `${ACCOUNT_PATH}?returnTo=${encodeURIComponent(resolvedReturnTo)}`;
}
