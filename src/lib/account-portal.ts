const ACCOUNT_PORTAL_ORIGIN = "https://account.fawxzzy.com";
const FITNESS_APP_ORIGIN = "https://fitness.fawxzzy.com";
const FITNESS_CONTEXT = "fitness";
const FITNESS_HANDOFF_RETURN_PATHS = new Set(["/", "/entry", "/today"]);

export function resolveFitnessHandoffReturnPath(returnTo: string | null | undefined) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/entry";
  }

  try {
    const resolved = new URL(returnTo, FITNESS_APP_ORIGIN);
    if (
      resolved.origin !== FITNESS_APP_ORIGIN
      || resolved.search
      || resolved.hash
      || !FITNESS_HANDOFF_RETURN_PATHS.has(resolved.pathname)
    ) {
      return "/entry";
    }

    return resolved.pathname;
  } catch {
    return "/entry";
  }
}

export function getFitnessAccountPortalUrl(
  pathname: "/account" | "/login" = "/account",
  returnTo?: string,
) {
  const url = new URL(pathname, ACCOUNT_PORTAL_ORIGIN);
  url.searchParams.set("app", FITNESS_CONTEXT);
  if (returnTo) {
    url.searchParams.set("returnTo", new URL(returnTo, FITNESS_APP_ORIGIN).href);
  }
  return url.href;
}

export function getFitnessLoginPortalUrl(returnTo?: string | null) {
  return getFitnessAccountPortalUrl("/login", resolveFitnessHandoffReturnPath(returnTo));
}
