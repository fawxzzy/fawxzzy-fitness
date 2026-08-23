"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { InstallGateChrome } from "@/components/install/InstallGateChrome";
import { getInstalledAppHref } from "@/lib/install/config";
import { getInstallContext } from "@/lib/install/getInstallContext";
import { useInstallContextOverride } from "@/lib/install/useInstallContextOverride";
import { usePWAInstallPrompt } from "@/components/install/usePWAInstallPrompt";
import { RouteLoading } from "@/components/RouteLoading";

export const FITNESS_INSTALL_STEPS = [
  "Open this page in your device's default browser.",
  "Tap Share, then choose More.",
  "Select Add to Home Screen, Install app, or Download.",
] as const;

export function InstallRouteSurface({
  initialInstallContext = null,
  initialReturnTo = null,
}: {
  initialInstallContext?: string | null;
  initialReturnTo?: string | null;
}) {
  const router = useRouter();
  const installPrompt = usePWAInstallPrompt();
  const override = useInstallContextOverride(initialInstallContext);
  const context = useMemo(
    () => getInstallContext({
      override,
      allowOverride: true,
      canUseNativeInstallPrompt: installPrompt.canPromptInstall,
    }),
    [installPrompt.canPromptInstall, override],
  );

  useEffect(() => {
    if (context.isStandalone) {
      router.replace(getInstalledAppHref(initialReturnTo ?? "/login"));
    }
  }, [context.isStandalone, initialReturnTo, router]);

  if (context.isStandalone) {
    return <RouteLoading label="Opening Fitness" variant="route" />;
  }

  return <InstallGateChrome steps={FITNESS_INSTALL_STEPS} />;
}
