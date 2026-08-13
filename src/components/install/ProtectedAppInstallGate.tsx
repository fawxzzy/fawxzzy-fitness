"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { RouteLoading } from "@/components/RouteLoading";
import { getInstallRouteHrefForReturnTo } from "@/lib/install/config";
import { getInstallContext } from "@/lib/install/getInstallContext";

type ProtectedAppInstallGateProps = {
  children: ReactNode;
};

export function ProtectedAppInstallGate({ children }: ProtectedAppInstallGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasResolvedClientInstallContext, setHasResolvedClientInstallContext] = useState(false);
  const context = useMemo(() => getInstallContext(), []);
  const currentPath = searchParams.size > 0 ? `${pathname}?${searchParams}` : pathname;
  // Recovery tokens are intentionally delivered in the URL fragment, which cannot survive an install-guide redirect.
  const isPasswordRecovery = pathname === "/reset-password" && searchParams.get("recovery") === "1";
  const shouldRedirectToInstall = context.shouldBlockAppAccess && pathname !== "/install" && !isPasswordRecovery;

  useEffect(() => {
    setHasResolvedClientInstallContext(true);

    if (shouldRedirectToInstall) {
      router.replace(getInstallRouteHrefForReturnTo(currentPath));
    }
  }, [currentPath, router, shouldRedirectToInstall]);

  if (!hasResolvedClientInstallContext || shouldRedirectToInstall) {
    return <RouteLoading label="Opening install guide" variant="route" />;
  }

  return children;
}
