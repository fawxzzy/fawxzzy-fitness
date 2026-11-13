// Shared production guard for dev-only routes (fixtures, diagnostics, QA helpers).
//
// A route is withdrawn (404) when either:
// - the platform says this is a production deployment (`VERCEL_ENV === "production"`), or
// - the platform signal is missing or unrecognised, this is a production-mode server
//   (`NODE_ENV === "production"`), the opt-in `HISTORY_QA_PREVIEW_ENABLED=1` is not set, and
//   the request host is not loopback. That branch fails closed when `VERCEL_ENV` is not
//   exposed to the runtime.
//
// `VERCEL_ENV=preview|development` is a positive platform signal and keeps the routes
// available. `NODE_ENV` alone is never the key: Vercel previews and local `next start`
// runs are production mode too. Local production-mode runs (for example
// `scripts/verify-history-family-ui.mjs`, which sets `HISTORY_QA_PREVIEW_ENABLED=1`) stay
// reachable through the opt-in or through a loopback host. No CI workflow runs `next start`.
//
// "Loopback" needs every host signal the request carries to be loopback: the request URL
// host and the `Host` header (never `x-forwarded-host`). On a self-hosted `next start`
// the URL host is the address the server is bound to, not what the client asked for, so
// the `Host` header has to agree. Only loopback names count: private-network addresses do
// not, because a client can send any `Host` value.
//
// Layers, outermost first:
// 1. `src/middleware.ts` answers 404 for every dev-only path before any page or handler
//    runs (see `isDevOnlyPath`). It is the only guard that covers every page.
// 2. Route handlers (a layout does not wrap them) return `devRouteUnavailableResponse(request)`
//    as their first statement.
// 3. Pages without a check of their own call `assertDevPageAvailable()`
//    (`src/lib/dev-route-guard-page.ts`) first. `src/app/dev/layout.tsx` repeats it, but a
//    layout does not stop its page from running, so it is not a guard on its own.

type EnvSource = Record<string, string | undefined>;

const NON_PRODUCTION_PLATFORM_SIGNALS = new Set(["preview", "development"]);
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isProductionDeployment(env: EnvSource = process.env): boolean {
  return env.VERCEL_ENV === "production";
}

export function isLoopbackHostname(hostname: string | null | undefined): boolean {
  if (!hostname) {
    return false;
  }

  return LOOPBACK_HOSTNAMES.has(hostname.trim().toLowerCase());
}

// "127.0.0.1:3000" -> "127.0.0.1", "[::1]:3000" -> "[::1]", "example.com" -> "example.com".
export function hostnameFromHostHeader(host: string | null | undefined): string | null {
  const trimmed = host?.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    return end === -1 ? null : trimmed.slice(0, end + 1);
  }

  return trimmed.split(":")[0] || null;
}

// Hostnames a request presents: its URL host, plus the `Host` header when present.
export function hostnamesOf(request: {
  url: string;
  headers?: { get(name: string): string | null };
}): string[] {
  let urlHostname = "";
  try {
    urlHostname = new URL(request.url).hostname;
  } catch {
    urlHostname = "";
  }

  const hostHeaderName = hostnameFromHostHeader(request.headers?.get("host"));
  return hostHeaderName ? [urlHostname, hostHeaderName] : [urlHostname];
}

export function isDevRouteWithdrawn({
  hostnames = [],
  env = process.env,
}: {
  hostnames?: ReadonlyArray<string | null | undefined>;
  env?: EnvSource;
} = {}): boolean {
  if (isProductionDeployment(env)) {
    return true;
  }

  if (env.VERCEL_ENV !== undefined && NON_PRODUCTION_PLATFORM_SIGNALS.has(env.VERCEL_ENV)) {
    return false;
  }

  // The platform signal is missing or unrecognised: fail closed on a production-mode server.
  if (env.NODE_ENV !== "production") {
    return false;
  }

  if (env.HISTORY_QA_PREVIEW_ENABLED === "1") {
    return false;
  }

  // Local only when the request presents at least one host and every one is loopback.
  return !(hostnames.length > 0 && hostnames.every((hostname) => isLoopbackHostname(hostname)));
}

export function devRouteUnavailableResponse(
  request: { url: string; headers?: { get(name: string): string | null } },
  env: EnvSource = process.env,
): Response | null {
  if (!isDevRouteWithdrawn({ hostnames: hostnamesOf(request), env })) {
    return null;
  }

  return Response.json(
    { ok: false, error: "Not found." },
    { status: 404, headers: { "cache-control": "no-store" } },
  );
}

// Paths withdrawn by this guard: the whole /dev tree, /api/dev, and the ecosystem debug endpoint.
const DEV_ONLY_PATH_PREFIXES = ["/dev", "/api/dev", "/api/ecosystem/fitness/debug"] as const;

export function isDevOnlyPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "");
  return DEV_ONLY_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}
