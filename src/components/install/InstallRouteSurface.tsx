"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InstallGateChrome } from "@/components/install/InstallGateChrome";
import { IOSAddToHomeScreenGate } from "@/components/install/IOSAddToHomeScreenGate";
import { IOSOpenInSafariGate } from "@/components/install/IOSOpenInSafariGate";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { getCanonicalInstallUrl, getInstallBypassHref, getInstalledAppHref, getIOSBrowserInstallUrl } from "@/lib/install/config";
import { copyInstallUrl, getInstallContext } from "@/lib/install/getInstallContext";
import { useInstallContextOverride } from "@/lib/install/useInstallContextOverride";
import { usePWAInstallPrompt } from "@/components/install/usePWAInstallPrompt";
import { RouteLoading } from "@/components/RouteLoading";

export function InstallRouteSurface({
  initialInstallContext = null,
  initialReturnTo = null,
}: {
  initialInstallContext?: string | null;
  initialReturnTo?: string | null;
}) {
  const router = useRouter();
  const installUrl = getCanonicalInstallUrl();
  const iosBrowserInstallUrl = getIOSBrowserInstallUrl();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [nativePromptWindowElapsed, setNativePromptWindowElapsed] = useState(false);
  const installPrompt = usePWAInstallPrompt();
  const override = useInstallContextOverride(initialInstallContext);

  const context = useMemo(
    () =>
      getInstallContext({
        override,
        allowOverride: true,
        canUseNativeInstallPrompt: installPrompt.canPromptInstall,
      }),
    [installPrompt.canPromptInstall, override],
  );
  const installSurfaceLabel = context.isAndroid
    ? "Android Install"
    : context.browserKind === "safari"
      ? "Safari Install"
      : "Browser Install";
  const shouldAutoContinueWithoutGuide = Boolean(
    nativePromptWindowElapsed
    && !context.isStandalone
    && !context.shouldShowIOSOpenInSafariGate
    && !context.shouldShowIOSAddToHomeScreenGate
    && !installPrompt.canPromptInstall,
  );

  useEffect(() => {
    setNativePromptWindowElapsed(false);
    const timeoutId = window.setTimeout(() => {
      setNativePromptWindowElapsed(true);
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [override]);

  useEffect(() => {
    if (context.isStandalone) {
      router.replace(getInstalledAppHref(initialReturnTo ?? "/login"));
    }
  }, [context.isStandalone, initialReturnTo, router]);

  useEffect(() => {
    if (shouldAutoContinueWithoutGuide) {
      router.replace(getInstallBypassHref(initialReturnTo ?? "/login"));
    }
  }, [initialReturnTo, router, shouldAutoContinueWithoutGuide]);

  const handleCopy = () => {
    copyInstallUrl(context.shouldShowIOSOpenInSafariGate ? iosBrowserInstallUrl : installUrl)
      .then(() => setCopyState("copied"))
      .catch(() => setCopyState("error"));
  };

  if (context.shouldShowIOSOpenInSafariGate) {
    return (
      <IOSOpenInSafariGate
        copyState={copyState}
        installUrl={iosBrowserInstallUrl}
        onCopy={handleCopy}
      />
    );
  }

  if (context.shouldShowIOSAddToHomeScreenGate) {
    return (
      <IOSAddToHomeScreenGate
        copyState={copyState}
        installUrl={installUrl}
        onCopy={handleCopy}
      />
    );
  }

  if (context.isStandalone) {
    return <RouteLoading label="Opening Fitness" variant="route" />;
  }

  if (shouldAutoContinueWithoutGuide || !nativePromptWindowElapsed) {
    return <RouteLoading label="Opening Fitness" variant="route" />;
  }

  return (
    <InstallGateChrome
      copyState={copyState}
      eyebrow="Install"
      installUrl={installUrl}
      onCopy={handleCopy}
      secondaryAction={installPrompt.canPromptInstall ? (
        <BottomDockButton
          intent="info"
          loading={installPrompt.isPrompting}
          loadingLabel="Installing app..."
          onClick={() => {
            void installPrompt.promptInstall();
          }}
          type="button"
        >
          Install
        </BottomDockButton>
      ) : undefined}
      title={context.isStandalone ? "Fitness is already installed" : "Install Fitness"}
    >
      <div className="space-y-3 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <AppBadge tone={context.isStandalone ? "success" : "default"}>
            {context.isStandalone ? "Installed" : installSurfaceLabel}
          </AppBadge>
          <AppBadge tone="success">
            Prompt Ready
          </AppBadge>
        </div>
        <MetricAccentBar variant="thin" className="mx-auto w-full max-w-[18rem] opacity-85" />
      </div>

      <ol className="space-y-2 rounded-[1.25rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2)/0.56)] px-4 py-4 text-center text-sm leading-6 text-[rgb(var(--text-secondary)/0.96)]">
        <li>1. Tap Install.</li>
        <li>2. Confirm the browser prompt.</li>
        <li>3. Open Fitness from the new app icon.</li>
      </ol>
    </InstallGateChrome>
  );
}
