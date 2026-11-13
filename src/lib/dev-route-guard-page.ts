import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hostnameFromHostHeader, isDevRouteWithdrawn } from "@/lib/dev-route-guard";

// First statement of every dev page that has no check of its own. The middleware already
// answers 404 for these paths; this keeps the page from running if a request skips it.
// `host` and `env` are injectable for tests; the defaults read the live request.
export function assertDevPageAvailable(
  host: string | null = headers().get("host"),
  env: Record<string, string | undefined> = process.env,
): void {
  if (isDevRouteWithdrawn({ hostnames: [hostnameFromHostHeader(host)], env })) {
    notFound();
  }
}
