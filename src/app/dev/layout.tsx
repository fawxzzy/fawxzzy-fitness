import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isProductionDeployment } from "@/lib/dev-route-guard";

// Every /dev/* page is a fixture or diagnostic surface. Withdraw the whole tree from
// production deployments here; route handlers under /dev guard themselves because a
// layout does not wrap them. Evaluated per request so a promoted build never carries a
// prerendered fixture into production.
export const dynamic = "force-dynamic";

export default function DevLayout({ children }: { children: ReactNode }) {
  if (isProductionDeployment()) {
    notFound();
  }

  return children;
}
