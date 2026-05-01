"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthCard, AuthDock, AuthIntro, AuthShell, AuthStack } from "@/components/auth/AuthShell";
import { IOSAddToHomeScreenGate } from "@/components/install/IOSAddToHomeScreenGate";
import { IOSOpenInSafariGate } from "@/components/install/IOSOpenInSafariGate";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { getCanonicalInstallUrl } from "@/lib/install/config";
import { copyInstallUrl, getInstallContext } from "@/lib/install/getInstallContext";
import { useInstallContextOverride } from "@/lib/install/useInstallContextOverride";
import { usePWAInstallPrompt } from "@/components/install/usePWAInstallPrompt";

export function InstallRouteSurface({ initialInstallContext = null }: { initialInstallContext?: string | null }) {
  const installUrl = getCanonicalInstallUrl();
  const openHref = "/login";
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const installPrompt = usePWAInstallPrompt();
  const override = useInstallContextOverride(initialInstallContext);

  const context = useMemo(
    () =>
      getInstallContext({
        override,
        canUseNativeInstallPrompt: installPrompt.canPromptInstall,
      }),
    [installPrompt.canPromptInstall, override],
  );
  const shouldAutoOpen = !context.shouldShowIOSOpenInSafariGate
    && !context.shouldShowIOSAddToHomeScreenGate
    && (context.isStandalone || !context.canUseNativeInstallPrompt);

  useEffect(() => {
    if (!shouldAutoOpen) {
      return;
    }

    window.location.replace(openHref);
  }, [openHref, shouldAutoOpen]);

  const handleCopy = () => {
    copyInstallUrl(installUrl)
      .then(() => setCopyState("copied"))
      .catch(() => setCopyState("error"));
  };

  if (context.shouldShowIOSOpenInSafariGate) {
    return (
      <IOSOpenInSafariGate
        copyState={copyState}
        installUrl={installUrl}
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
        primaryHref={openHref}
        primaryLabel="Open"
      />
    );
  }

  if (shouldAutoOpen) {
    return null;
  }

  return (
    <AuthShell>
      <AuthCard className="mx-auto w-full max-w-md">
        <AuthIntro
          eyebrow="Install Flow"
          subtitle="Use the browser install prompt here, or open Fitness directly."
          title="Install Fitness"
        />
        <AuthStack className="pt-6" size="compact">
          <div className="rounded-[1.25rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2)/0.84)] px-4 py-4 text-sm leading-6 text-[rgb(var(--text-secondary)/0.96)]">
            <p>The install prompt is owned by this app and browser. If you just want to sign in, choose Open.</p>
          </div>
        </AuthStack>
      </AuthCard>

      <AuthDock>
        <BottomActionSplit
          primary={(
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
          )}
          secondary={(
            <BottomDockLink href={openHref} intent="positive">
              Open
            </BottomDockLink>
          )}
        />
      </AuthDock>
    </AuthShell>
  );
}
