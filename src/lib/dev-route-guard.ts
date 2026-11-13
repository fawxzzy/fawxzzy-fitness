// Shared production guard for dev-only routes (fixtures, diagnostics, QA helpers).
//
// The decision keys on the deployment environment, not on NODE_ENV: CI and local
// verification run `next start` in production mode on localhost and still need the
// dev fixture routes. Vercel sets VERCEL_ENV at build and at runtime, so a
// production deployment is the only place these routes are withdrawn.
//
// Layers, outermost first:
// 1. `src/middleware.ts` answers 404 for every dev-only path before any page or handler
//    runs (see `isDevOnlyPath`). A layout alone is not enough: Next renders a page in
//    parallel with its layout, so the page code still executes when only the layout bails.
// 2. `src/app/dev/layout.tsx` calls `notFound()` for the `/dev` tree.
// 3. Route handlers (which a layout does not cover) return `devRouteUnavailableResponse()`
//    as their first statement.

type EnvSource = Record<string, string | undefined>;

export function isProductionDeployment(env: EnvSource = process.env): boolean {
  return env.VERCEL_ENV === "production";
}

export function devRouteUnavailableResponse(env: EnvSource = process.env): Response | null {
  if (!isProductionDeployment(env)) {
    return null;
  }

  return Response.json(
    { ok: false, error: "Not found." },
    { status: 404, headers: { "cache-control": "no-store" } },
  );
}

// Paths withdrawn from production deployments: the whole /dev tree, /api/dev, and the
// ecosystem debug endpoint.
const DEV_ONLY_PATH_PREFIXES = ["/dev", "/api/dev", "/api/ecosystem/fitness/debug"] as const;

export function isDevOnlyPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "");
  return DEV_ONLY_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}
