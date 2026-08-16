import { resolveCanonicalAppOrigin } from "@/lib/app-origin";

export const INSTALL_BYPASS_QUERY_PARAM = "installBypass";
export const INSTALLED_APP_QUERY_PARAM = "installedApp";

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}
export function getCanonicalAppUrl() {
  return normalizeUrl(resolveCanonicalAppOrigin());
}

export function getCanonicalInstallUrl() {
  return `${getCanonicalAppUrl()}/install`;
}

function normalizeLocalPath(rawPath: string | null | undefined, fallback = "/login") {
  const candidate = rawPath?.trim();

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://fitness.local");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function getInstallRouteHrefForReturnTo(returnTo: string | null | undefined) {
  const installRoute = new URL("/install", "https://fitness.local");
  installRoute.searchParams.set("returnTo", normalizeLocalPath(returnTo));
  return `${installRoute.pathname}${installRoute.search}`;
}

export function getInstallBypassHref(returnTo: string | null | undefined) {
  const target = new URL(normalizeLocalPath(returnTo), "https://fitness.local");
  target.searchParams.set(INSTALL_BYPASS_QUERY_PARAM, "1");
  return `${target.pathname}${target.search}${target.hash}`;
}

export function getInstalledAppHref(returnTo: string | null | undefined) {
  const target = new URL(normalizeLocalPath(returnTo), "https://fitness.local");
  target.searchParams.set(INSTALLED_APP_QUERY_PARAM, "1");
  return `${target.pathname}${target.search}${target.hash}`;
}

export function getInstallUrlForContext(installContext: string | null | undefined) {
  const installUrl = new URL(getCanonicalInstallUrl());

  if (installContext) {
    installUrl.searchParams.set("installContext", installContext);
  }

  return normalizeUrl(installUrl.toString());
}

export function getIOSBrowserInstallUrl() {
  return getInstallUrlForContext("ios-safari");
}
