"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InstallScreen, type InstallCopyState, type InstallScreenKind } from "@/components/install/InstallGateChrome";
import { getCanonicalInstallUrl, getInstalledAppHref } from "@/lib/install/config";
import { getInstallContext, type InstallContext } from "@/lib/install/getInstallContext";
import { useInstallContextOverride } from "@/lib/install/useInstallContextOverride";
import { usePWAInstallPrompt } from "@/components/install/usePWAInstallPrompt";
import { RouteLoading } from "@/components/RouteLoading";

/** Which install screen this browser gets. No screen offers a way into the app before it runs installed. */
export function resolveInstallScreenKind(
  context: Pick<InstallContext, "platform" | "browserKind" | "hasSupportedInstallPath" | "shouldShowIOSOpenInSafariGate" | "shouldShowIOSAddToHomeScreenGate" | "canUseNativeInstallPrompt">,
  { isInstalled = false }: { isInstalled?: boolean } = {},
): InstallScreenKind {
  if (isInstalled) {
    return "installed";
  }
  if (context.shouldShowIOSOpenInSafariGate) {
    return "ios-inapp";
  }
  if (context.shouldShowIOSAddToHomeScreenGate) {
    return "ios-safari";
  }
  if (!context.hasSupportedInstallPath) {
    return "unsupported";
  }
  if (context.canUseNativeInstallPrompt) {
    return "prompt";
  }
  if (context.platform === "desktop") {
    return context.browserKind === "safari" ? "desktop-safari" : "desktop";
  }
  return "manual";
}

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
  const [hasResolvedClientInstallContext, setHasResolvedClientInstallContext] = useState(false);
  const [copyState, setCopyState] = useState<InstallCopyState>("idle");
  const context = useMemo(
    () => getInstallContext({
      override,
      allowOverride: true,
      canUseNativeInstallPrompt: installPrompt.canPromptInstall,
    }),
    [installPrompt.canPromptInstall, override],
  );

  useEffect(() => {
    setHasResolvedClientInstallContext(true);
    if (context.isStandalone) {
      router.replace(getInstalledAppHref(initialReturnTo ?? "/login"));
    }
  }, [context.isStandalone, initialReturnTo, router]);

  useEffect(() => {
    if (copyState !== "copied") {
      return;
    }
    const timer = window.setTimeout(() => setCopyState("idle"), 2400);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  if (!hasResolvedClientInstallContext || context.isStandalone) {
    return <RouteLoading label="Opening Fitness…" variant="route" />;
  }

  const kind = resolveInstallScreenKind(context, { isInstalled: installPrompt.isInstalled });

  return (
    <InstallScreen
      kind={kind}
      copyState={copyState}
      isPrompting={installPrompt.isPrompting}
      onInstall={() => {
        void installPrompt.promptInstall();
      }}
      onCopy={() => {
        const url = getCanonicalInstallUrl();
        void navigator.clipboard?.writeText(url).then(
          () => setCopyState("copied"),
          () => setCopyState("error"),
        );
      }}
    />
  );
}
