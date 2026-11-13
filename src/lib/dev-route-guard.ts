// Shared production guard for dev-only routes (fixtures, diagnostics, QA helpers).
//
// A route is withdrawn (404) when either:
// - the platform says this is a production deployment (`VERCEL_ENV === "production"`), or
// - the platform signal is missing or unrecognised and nothing else shows this is a local
//   run: `NODE_ENV` is anything other than an explicit "development" or "test" (undefined,
//   "", "Production", "staging" and every unknown value fail closed), the opt-in
//   `HISTORY_QA_PREVIEW_ENABLED=1` is not honoured, and the request is not loopback.
//
// `VERCEL_ENV=preview|development` is a positive platform signal and keeps the routes
// available. `NODE_ENV` alone is never the key: Vercel previews and local `next start`
// runs are production mode too.
//
// The real controls are `VERCEL_ENV`, the opt-in and `NODE_ENV`. The loopback exception is a
// convenience for local production-mode runs (for example
// `scripts/verify-history-family-ui.mjs`, which sets `HISTORY_QA_PREVIEW_ENABLED=1` and uses
// `127.0.0.1`). It is NOT a security control on a server others can reach: loopback names
// arrive in a client-supplied `Host` header too. No CI workflow runs `next start`.
//
// - The opt-in is refused when any host signal is a production hostname (the canonical
//   or legacy production host, or any `*.vercel.app` name), so a stray opt-in in the
//   Production environment cannot reopen the routes.
// - Host signals are the request URL host and the `Host` header, never `x-forwarded-host`. A
//   missing or unparsable `Host` header counts as non-loopback. On a self-hosted
//   `next start` the URL host is the bind address, so the header has to agree.
// - Environment values are read through literal `process.env.NAME` expressions
//   (`readDevGuardEnv`) because Next inlines only the literal `process.env.NODE_ENV`
//   expression; an aliased `process.env` object would depend on the runtime populating it.
//
// Service-role pages and handlers (those that read with the admin client from a client-supplied
// user id) use the stricter `isDevServiceRoleRouteWithdrawn`: on anything but an explicit
// development or test run they also require a loopback request, so neither a preview
// deployment nor the opt-in makes them reachable.
//
// Layers, outermost first:
// 1. `src/middleware.ts` answers 404 for every dev-only path before any page or handler runs
//    (see `isDevOnlyPath`). Middleware is not sufficient on its own: the `x-middleware-subrequest`
//    bypass class (CVE-2025-29927) let a request skip it on Next 14.2.5; it is patched in the
//    pinned Next 14.2.35, but the handler and page guards below stay as defence in depth.
// 2. Route handlers (a layout does not wrap them) return `devRouteUnavailableResponse(request)`
//    (or the service-role variant) as their first statement.
// 3. Pages without a check of their own call `assertDevPageAvailable()`, and service-role pages
//    call `assertDevServiceRolePageAvailable()` (`src/lib/dev-route-guard-page.ts`), first.
//    `src/app/dev/layout.tsx` repeats the first, but a layout does not stop its page from
//    running, so it is not a guard on its own.

import { FITNESS_CANONICAL_ORIGIN } from "@/lib/app-origin";

type EnvSource = Readonly<Record<string, string | undefined>>;

const NON_PRODUCTION_PLATFORM_SIGNALS = new Set(["preview", "development"]);
const LOCAL_NODE_ENVS = new Set(["development", "test"]);
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const LEGACY_PRODUCTION_HOSTNAME = "fawxzzy-fitness-local.vercel.app";
const HOST_HEADER_PATTERN = /^(\[[0-9a-f:]+\]|[a-z0-9.-]+)(:\d{1,5})?$/;

function canonicalProductionHostname() {
  try {
    return new URL(FITNESS_CANONICAL_ORIGIN).hostname.toLowerCase();
  } catch {
    return "";
  }
}

// Literal reads only: see the header comment.
export function readDevGuardEnv(): EnvSource {
  return {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    HISTORY_QA_PREVIEW_ENABLED: process.env.HISTORY_QA_PREVIEW_ENABLED,
  };
}

function normalizeHostname(hostname: string | null | undefined): string {
  const lowered = (hostname ?? "").trim().toLowerCase();
  return lowered.endsWith(".") ? lowered.slice(0, -1) : lowered;
}

export function isProductionDeployment(env: EnvSource = readDevGuardEnv()): boolean {
  return env.VERCEL_ENV === "production";
}

export function isLoopbackHostname(hostname: string | null | undefined): boolean {
  return LOOPBACK_HOSTNAMES.has(normalizeHostname(hostname));
}

export function isProductionHostname(hostname: string | null | undefined): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) {
    return false;
  }

  return (
    normalized === canonicalProductionHostname()
    || normalized === LEGACY_PRODUCTION_HOSTNAME
    || normalized.endsWith(".vercel.app")
  );
}

// "127.0.0.1:3000" -> "127.0.0.1", "[::1]:3000" -> "[::1]", "LocalHost" -> "localhost".
// Anything that is not a host with an optional numeric port is unparsable (null).
export function hostnameFromHostHeader(host: string | null | undefined): string | null {
  const match = HOST_HEADER_PATTERN.exec((host ?? "").trim().toLowerCase());
  return match ? match[1] : null;
}

// Hostnames a request presents: its URL host and its `Host` header. A missing or
// unparsable header contributes "" (never loopback), so the layers agree with the page guard.
export function hostnamesOf(request: {
  url: string;
  headers: { get(name: string): string | null };
}): string[] {
  let urlHostname = "";
  try {
    urlHostname = new URL(request.url).hostname;
  } catch {
    urlHostname = "";
  }

  return [urlHostname, hostnameFromHostHeader(request.headers.get("host")) ?? ""];
}

export function isDevRouteWithdrawn({
  hostnames = [],
  env = readDevGuardEnv(),
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

  const names = hostnames.map(normalizeHostname);

  // The platform signal is missing or unrecognised. Only an explicit local NODE_ENV is exempt,
  // and never for a request that names a production hostname.
  if (env.NODE_ENV !== undefined && LOCAL_NODE_ENVS.has(env.NODE_ENV) && !names.some(isProductionHostname)) {
    return false;
  }

  if (env.HISTORY_QA_PREVIEW_ENABLED === "1" && !names.some(isProductionHostname)) {
    return false;
  }

  // Local convenience: at least one host presented and every one is loopback.
  return !(names.length > 0 && names.every(isLoopbackHostname));
}

// Stricter rule for pages and handlers that read with the service-role client from a
// client-supplied user id. Withdrawn whenever the general rule withdraws, and otherwise unless
// this is an explicit development or test run (never on a production hostname) or a loopback
// request. A preview platform signal or the opt-in does not admit them.
export function isDevServiceRoleRouteWithdrawn({
  hostnames = [],
  env = readDevGuardEnv(),
}: {
  hostnames?: ReadonlyArray<string | null | undefined>;
  env?: EnvSource;
} = {}): boolean {
  if (isDevRouteWithdrawn({ hostnames, env })) {
    return true;
  }

  const names = hostnames.map(normalizeHostname);
  if (env.NODE_ENV !== undefined && LOCAL_NODE_ENVS.has(env.NODE_ENV) && !names.some(isProductionHostname)) {
    return false;
  }

  return !(names.length > 0 && names.every(isLoopbackHostname));
}

export function devRouteUnavailableResponse(
  request: { url: string; headers: { get(name: string): string | null } },
  env: EnvSource = readDevGuardEnv(),
): Response | null {
  return withdrawnResponse(isDevRouteWithdrawn({ hostnames: hostnamesOf(request), env }));
}

export function devServiceRoleRouteUnavailableResponse(
  request: { url: string; headers: { get(name: string): string | null } },
  env: EnvSource = readDevGuardEnv(),
): Response | null {
  return withdrawnResponse(isDevServiceRoleRouteWithdrawn({ hostnames: hostnamesOf(request), env }));
}

function withdrawnResponse(withdrawn: boolean): Response | null {
  if (!withdrawn) {
    return null;
  }

  return Response.json(
    { ok: false, error: "Not found." },
    { status: 404, headers: { "cache-control": "no-store" } },
  );
}

// Path segments as the router will see them: percent-decoded per segment (a decoded `%2F`
// splits further), lower-cased, with empty and `.` segments dropped and `..` resolved.
function routerSegments(pathname: string): string[] {
  const segments: string[] = [];

  for (const raw of pathname.split("/")) {
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }

    for (const part of decoded.toLowerCase().split("/")) {
      if (part === "" || part === ".") {
        continue;
      }

      if (part === "..") {
        segments.pop();
        continue;
      }

      segments.push(part);
    }
  }

  return segments;
}

// Paths withdrawn by this guard: the whole /dev tree, /api/dev, and the ecosystem debug endpoint.
const DEV_ONLY_PATH_PREFIXES: ReadonlyArray<readonly string[]> = [
  ["dev"],
  ["api", "dev"],
  ["api", "ecosystem", "fitness", "debug"],
];

export function isDevOnlyPath(pathname: string): boolean {
  const segments = routerSegments(pathname);

  return DEV_ONLY_PATH_PREFIXES.some((prefix) => prefix.every((part, index) => segments[index] === part));
}
