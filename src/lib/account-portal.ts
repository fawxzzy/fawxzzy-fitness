const ACCOUNT_PORTAL_ORIGIN = "https://account.fawxzzy.com";
const FITNESS_CONTEXT = "fitness";

export function getFitnessAccountPortalUrl(
  pathname: "/account" | "/login" = "/account",
  returnTo?: string,
) {
  const url = new URL(pathname, ACCOUNT_PORTAL_ORIGIN);
  url.searchParams.set("app", FITNESS_CONTEXT);
  if (returnTo) {
    url.searchParams.set("returnTo", new URL(returnTo, "https://fitness.fawxzzy.com").href);
  }
  return url.href;
}
