"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { IOSOpenInSafariGate } from "@/components/install/IOSOpenInSafariGate";
import { RouteLoading } from "@/components/RouteLoading";
import {
  getInstallRouteHrefForReturnTo,
  getIOSBrowserInstallUrl,
  INSTALLED_APP_QUERY_PARAM,
  INSTALL_BYPASS_QUERY_PARAM,
} from "@/lib/install/config";
import { copyInstallUrl, getInstallContext } from "@/lib/install/getInstallContext";
import { useInstallContextOverride } from "@/lib/install/useInstallContextOverride";
import { startLoadingDiagnosticGate } from "@/lib/loading-diagnostics";

type ProtectedAppInstallGateProps = {
  children: ReactNode;
};

const PUBLIC_PATH_PREFIXES = [
  "/install",
  "/auth",
  "/dev",
  "/review",
];

const AUTH_INSTALL_ENTRY_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function ProtectedAppInstallGate({ children }: ProtectedAppInstallGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [isHydrated, setIsHydrated] = useState(false);
  const [installBypassPath, setInstallBypassPath] = useState<string | null>(null);
  const gateRef = useRef<ReturnType<typeof startLoadingDiagnosticGate> | null>(null);
  const installUrl = getIOSBrowserInstallUrl();
  const override = useInstallContextOverride(pathname);
  const currentSearch = searchParams.toString();
  const hasBypassQuery = searchParams.get(INSTALL_BYPASS_QUERY_PARAM) === "1";
  const hasInstalledAppQuery = searchParams.get(INSTALLED_APP_QUERY_PARAM) === "1";
  const hasInstallBypass = Boolean(pathname && installBypassPath === pathname);
  const isRecoveryResetRoute = pathname === "/reset-password" && searchParams.get("recovery") === "1";

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const context = useMemo(
    () => getInstallContext({ override }),
    [override],
  );
  const shouldRedirectAuthEntryToInstall = Boolean(
    pathname
    && AUTH_INSTALL_ENTRY_PATHS.has(pathname)
    && isHydrated
    && !context.isStandalone
    && !isRecoveryResetRoute
    && !hasInstallBypass
    && !hasBypassQuery
    && !hasInstalledAppQuery,
  );

  useEffect(() => {
    if ((!hasBypassQuery && !hasInstalledAppQuery) || !pathname) {
      return;
    }

    setInstallBypassPath(pathname);

    const cleanParams = new URLSearchParams(currentSearch);
    cleanParams.delete(INSTALL_BYPASS_QUERY_PARAM);
    cleanParams.delete(INSTALLED_APP_QUERY_PARAM);
    const cleanQuery = cleanParams.toString();
    const cleanHref = cleanQuery ? `${pathname}?${cleanQuery}` : pathname;
    window.history.replaceState(window.history.state, "", cleanHref);
  }, [currentSearch, hasBypassQuery, hasInstalledAppQuery, pathname]);

  useEffect(() => {
    if (!shouldRedirectAuthEntryToInstall || !pathname) {
      return;
    }

    const currentParams = new URLSearchParams(currentSearch);
    currentParams.delete(INSTALL_BYPASS_QUERY_PARAM);
    currentParams.delete(INSTALLED_APP_QUERY_PARAM);
    const query = currentParams.toString();
    const returnTo = query ? `${pathname}?${query}` : pathname;
    router.replace(getInstallRouteHrefForReturnTo(returnTo));
  }, [currentSearch, pathname, router, shouldRedirectAuthEntryToInstall]);

  useEffect(() => {
    const shouldBlock = Boolean(
      pathname
      && !isPublicPath(pathname)
      && isHydrated
      && context.shouldBlockAppAccess,
    );

    if (!shouldBlock) {
      gateRef.current?.resolve({
        blockingReason: "Install gate no longer blocks app access.",
      });
      gateRef.current = null;
      return;
    }

    if (!gateRef.current) {
      gateRef.current = startLoadingDiagnosticGate({
        gate: "app.install-gate",
        route: pathname,
        source: "client",
        blockingReason: "Protected install gate is blocking app access on this device context.",
        metadata: {
          hasOverride: Boolean(override),
          shouldBlockAppAccess: context.shouldBlockAppAccess,
          shouldShowIOSOpenInSafariGate: context.shouldShowIOSOpenInSafariGate,
          shouldShowIOSAddToHomeScreenGate: context.shouldShowIOSAddToHomeScreenGate,
        },
        timeoutMs: 3000,
      });
      return;
    }

    gateRef.current.pending({
      metadata: {
        hasOverride: Boolean(override),
        shouldBlockAppAccess: context.shouldBlockAppAccess,
        shouldShowIOSOpenInSafariGate: context.shouldShowIOSOpenInSafariGate,
        shouldShowIOSAddToHomeScreenGate: context.shouldShowIOSAddToHomeScreenGate,
      },
    });
  }, [context.shouldBlockAppAccess, context.shouldShowIOSAddToHomeScreenGate, context.shouldShowIOSOpenInSafariGate, isHydrated, override, pathname]);

  if (shouldRedirectAuthEntryToInstall) {
    return <RouteLoading label="Opening install guide" variant="route" />;
  }

  if (!pathname || isPublicPath(pathname) || (!isHydrated && !override) || !context.shouldBlockAppAccess) {
    return <>{children}</>;
  }

  const handleCopy = () => {
    copyInstallUrl(installUrl)
      .then(() => setCopyState("copied"))
      .catch(() => setCopyState("error"));
  };

  if (context.shouldShowIOSOpenInSafariGate) {
    return <IOSOpenInSafariGate copyState={copyState} installUrl={installUrl} onCopy={handleCopy} />;
  }

  return <>{children}</>;
}
