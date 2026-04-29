"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IOSAddToHomeScreenGate } from "@/components/install/IOSAddToHomeScreenGate";
import { IOSOpenInSafariGate } from "@/components/install/IOSOpenInSafariGate";
import { getCanonicalInstallUrl } from "@/lib/install/config";
import { copyInstallUrl, getInstallContext } from "@/lib/install/getInstallContext";
import { useInstallContextOverride } from "@/lib/install/useInstallContextOverride";

type ProtectedAppInstallGateProps = {
  children: ReactNode;
};

const PUBLIC_PATH_PREFIXES = [
  "/install",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/dev",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function ProtectedAppInstallGate({ children }: ProtectedAppInstallGateProps) {
  const pathname = usePathname();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [isHydrated, setIsHydrated] = useState(false);
  const installUrl = getCanonicalInstallUrl();
  const override = useInstallContextOverride(pathname);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const context = useMemo(
    () => getInstallContext({ override }),
    [override],
  );

  if (!pathname || isPublicPath(pathname) || (!isHydrated && !override) || context.shouldAllowAppAccess) {
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

  if (context.shouldShowIOSAddToHomeScreenGate) {
    return <IOSAddToHomeScreenGate copyState={copyState} installUrl={installUrl} onCopy={handleCopy} />;
  }

  return <>{children}</>;
}
