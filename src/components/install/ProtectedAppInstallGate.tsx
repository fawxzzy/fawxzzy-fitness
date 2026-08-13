"use client";

import { useEffect, useMemo } from "react";
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
  const context = useMemo(() => getInstallContext(), []);
  const currentPath = searchParams.size > 0 ? `${pathname}?${searchParams}` : pathname;
  const shouldRedirectToInstall = context.shouldBlockAppAccess && pathname !== "/install";

  useEffect(() => {
    if (shouldRedirectToInstall) {
      router.replace(getInstallRouteHrefForReturnTo(currentPath));
    }
  }, [currentPath, router, shouldRedirectToInstall]);

  if (shouldRedirectToInstall) {
    return <RouteLoading label="Opening install guide" variant="route" />;
  }

  return children;
}
