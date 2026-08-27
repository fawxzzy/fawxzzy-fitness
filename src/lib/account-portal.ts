const ACCOUNT_PORTAL_ORIGIN = "https://account.fawxzzy.com";
const FITNESS_CONTEXT = "fitness";

export function getFitnessAccountPortalUrl(pathname: "/account" | "/login" = "/account") {
  const url = new URL(pathname, ACCOUNT_PORTAL_ORIGIN);
  url.searchParams.set("app", FITNESS_CONTEXT);
  return url.href;
}
