import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  hostnameFromHostHeader,
  isDevRouteWithdrawn,
  isDevServiceRoleRouteWithdrawn,
  readDevGuardEnv,
} from "@/lib/dev-route-guard";

// The live request's `Host` header (Next 16: `headers()` is async only).
async function readRequestHostHeader(): Promise<string | null> {
  return (await headers()).get("host");
}

// First statement of every dev page that has no check of its own, and of every page that
// reads with the service-role client: `await assertDevPageAvailable();`. The proxy already
// answers 404 for these paths; this keeps the page from running if a request skips it. A
// missing or unparsable `Host` header counts as non-loopback. `host` and `env` are injectable
// for tests; when `host` is omitted the live request is read.
//
// The guard is async, so a call without `await` would let the page run on (the 404 would only
// surface as an unhandled rejection). `src/lib/async-request-helpers.contract.test.ts` fails on
// any call site that is not awaited, and `src/lib/dev-page-guard-runtime.test.ts` renders every
// dev page with no Host header on a production server and expects a 404.
export async function assertDevPageAvailable(
  host?: string | null,
  env: Readonly<Record<string, string | undefined>> = readDevGuardEnv(),
): Promise<void> {
  const requestHost = host === undefined ? await readRequestHostHeader() : host;
  if (isDevRouteWithdrawn({ hostnames: [hostnameFromHostHeader(requestHost) ?? ""], env })) {
    notFound();
  }
}

// First statement of every dev page that reads with the service-role client from a
// client-supplied user id. Stricter than assertDevPageAvailable: see isDevServiceRoleRouteWithdrawn.
export async function assertDevServiceRolePageAvailable(
  host?: string | null,
  env: Readonly<Record<string, string | undefined>> = readDevGuardEnv(),
): Promise<void> {
  const requestHost = host === undefined ? await readRequestHostHeader() : host;
  if (isDevServiceRoleRouteWithdrawn({ hostnames: [hostnameFromHostHeader(requestHost) ?? ""], env })) {
    notFound();
  }
}
