import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  hostnameFromHostHeader,
  isDevRouteWithdrawn,
  isDevServiceRoleRouteWithdrawn,
  readDevGuardEnv,
} from "@/lib/dev-route-guard";

// First statement of every dev page that has no check of its own, and of every page that
// reads with the service-role client. The middleware already answers 404 for these paths;
// this keeps the page from running if a request skips it. A missing or unparsable `Host`
// header counts as non-loopback. `host` and `env` are injectable for tests; the defaults
// read the live request.
export function assertDevPageAvailable(
  host: string | null = headers().get("host"),
  env: Readonly<Record<string, string | undefined>> = readDevGuardEnv(),
): void {
  if (isDevRouteWithdrawn({ hostnames: [hostnameFromHostHeader(host) ?? ""], env })) {
    notFound();
  }
}

// First statement of every dev page that reads with the service-role client from a
// client-supplied user id. Stricter than assertDevPageAvailable: see isDevServiceRoleRouteWithdrawn.
export function assertDevServiceRolePageAvailable(
  host: string | null = headers().get("host"),
  env: Readonly<Record<string, string | undefined>> = readDevGuardEnv(),
): void {
  if (isDevServiceRoleRouteWithdrawn({ hostnames: [hostnameFromHostHeader(host) ?? ""], env })) {
    notFound();
  }
}
