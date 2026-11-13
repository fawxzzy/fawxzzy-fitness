import type { ReactNode } from "react";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";

// Renders the 404 UI for the /dev tree when the shared guard withdraws it. A layout does
// not stop the page under it from running (Next renders them in parallel), so this is not
// a code guard: the middleware covers every /dev path, and each page without a check of its
// own calls `assertDevPageAvailable()` itself. Route handlers are not wrapped by a layout
// and guard themselves. Evaluated per request so a promoted build never carries a
// prerendered fixture into production.
export const dynamic = "force-dynamic";

export default function DevLayout({ children }: { children: ReactNode }) {
  assertDevPageAvailable();

  return children;
}
