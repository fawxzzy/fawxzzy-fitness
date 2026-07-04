"use client";

import { useMemo, useState } from "react";
import { AuthCard, AuthDock, AuthIntro, AuthShell, AuthStack } from "@/components/auth/AuthShell";
import { IOSAddToHomeScreenGate } from "@/components/install/IOSAddToHomeScreenGate";
import { IOSOpenInSafariGate } from "@/components/install/IOSOpenInSafariGate";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { MetricAccentBar } from "@/components/ui/MetricItem";
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

  return (
    <AuthShell>
      <AuthCard className="mx-auto w-full max-w-md">
        <AuthIntro
          eyebrow="Install"
          subtitle={context.isStandalone ? "Fitness is already running in installed mode on this device." : "Use the browser install prompt here, or open Fitness directly."}
          title={context.isStandalone ? "Fitness is already installed" : "Install Fitness"}
        />
        <AuthStack className="pt-6" size="compact">
          <div className="space-y-3 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <AppBadge tone={context.isStandalone ? "success" : "default"}>
                {context.isStandalone ? "Installed" : "Browser Install"}
              </AppBadge>
              <AppBadge tone={context.canUseNativeInstallPrompt ? "success" : "warning"}>
                {context.canUseNativeInstallPrompt ? "Prompt Ready" : "Menu Install"}
              </AppBadge>
            </div>
            <MetricAccentBar variant="thin" className="mx-auto w-full max-w-[18rem] opacity-85" />
          </div>

          <div className="rounded-[1.25rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2)/0.84)] px-4 py-4 text-sm leading-6 text-[rgb(var(--text-secondary)/0.96)]">
            <p>
              {context.isStandalone
                ? "You can keep training in the installed app, or use Open if you want the browser route."
                : context.canUseNativeInstallPrompt
                  ? "The install prompt is owned by this app and browser. If you just want to sign in, choose Open."
                  : "This browser is not offering the one-tap install prompt right now. You can still open Fitness normally, or use your browser menu to add it to your home screen."}
            </p>
            {!context.isStandalone && !context.canUseNativeInstallPrompt ? (
              <p className="mt-2 text-[0.82rem] leading-5 text-[rgb(var(--text-muted)/0.9)]">
                Look for Share, Add to Home Screen, or Install app depending on your browser.
              </p>
            ) : null}
          </div>
        </AuthStack>
      </AuthCard>

      <AuthDock>
        <BottomActionSplit
          primary={(
            <BottomDockButton
              intent="info"
              disabled={!installPrompt.canPromptInstall}
              loading={installPrompt.isPrompting}
              loadingLabel="Installing app..."
              onClick={() => {
                void installPrompt.promptInstall();
              }}
              type="button"
            >
              {installPrompt.canPromptInstall ? "Install" : "Use browser menu"}
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
