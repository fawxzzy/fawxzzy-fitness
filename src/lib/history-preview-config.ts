export const HISTORY_PREVIEW_COOKIE_NAME = "atlas-history-preview";
export const HISTORY_PREVIEW_FLAG_ENV = "HISTORY_QA_PREVIEW_ENABLED";

const HISTORY_PREVIEW_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const HISTORY_PREVIEW_ALLOWED_PATH_PREFIX = "/history";

export function isHistoryPreviewEnabledInEnv() {
  return process.env.NODE_ENV !== "production" && process.env[HISTORY_PREVIEW_FLAG_ENV] === "1";
}

export function isHistoryPreviewAllowedHost(hostname: string | null | undefined) {
  if (!hostname) {
    return false;
  }

  const normalizedHost = hostname.trim().toLowerCase();
  const withoutPort = normalizedHost.startsWith("[")
    ? normalizedHost.slice(0, normalizedHost.indexOf("]") + 1)
    : normalizedHost.includes(":")
      ? normalizedHost.slice(0, normalizedHost.indexOf(":"))
      : normalizedHost;

  return HISTORY_PREVIEW_HOSTNAMES.has(withoutPort);
}

export function normalizeHistoryPreviewTarget(target: string | null | undefined) {
  if (!target) {
    return "/history";
  }

  if (!target.startsWith("/")) {
    return "/history";
  }

  try {
    const parsedTarget = new URL(target, "http://localhost");
    if (!parsedTarget.pathname.startsWith(HISTORY_PREVIEW_ALLOWED_PATH_PREFIX)) {
      return "/history";
    }

    return `${parsedTarget.pathname}${parsedTarget.search}`;
  } catch {
    return "/history";
  }
}
