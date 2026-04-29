"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AuthCard, AuthDock, AuthIntro, AuthShell, AuthStack } from "@/components/auth/AuthShell";
import { IOSAddToHomeScreenGate } from "@/components/install/IOSAddToHomeScreenGate";
import { IOSOpenInSafariGate } from "@/components/install/IOSOpenInSafariGate";
import { BottomActionSingle, BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { getCanonicalInstallUrl } from "@/lib/install/config";
import { copyInstallUrl, getInstallContext } from "@/lib/install/getInstallContext";
import { useInstallContextOverride } from "@/lib/install/useInstallContextOverride";
import { usePWAInstallPrompt } from "@/components/install/usePWAInstallPrompt";

const secondaryLinkClassName = getAppButtonClassName({
  variant: "secondary",
  fullWidth: true,
});

export function InstallRouteSurface({ initialInstallContext = null }: { initialInstallContext?: string | null }) {
  const installUrl = getCanonicalInstallUrl();
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
        primaryHref="/login"
        primaryLabel="Go to login"
      />
    );
  }

  return (
    <AuthShell>
      <AuthCard className="mx-auto w-full max-w-md">
        <AuthIntro
          eyebrow="Install Flow"
          subtitle="Continue into the app or go to login."
          title={context.isStandalone ? "Open Fitness" : "Install or continue"}
        />
        <AuthStack className="pt-6" size="compact">
          {context.isStandalone || !context.canUseNativeInstallPrompt ? (
            <div className="rounded-[1.25rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2)/0.84)] px-4 py-4 text-sm leading-6 text-[rgb(var(--text-secondary)/0.96)]">
              {context.isStandalone ? (
                <p>Fitness is already running in standalone mode. Continue into the app.</p>
              ) : (
                <p>Fitness can still be used in the browser here. If install is not available yet, continue into the app.</p>
              )}
            </div>
          ) : null}
          {!context.canUseNativeInstallPrompt || context.isStandalone ? (
            <Link className={secondaryLinkClassName} href="/entry">
              Continue to app
            </Link>
          ) : null}
        </AuthStack>
      </AuthCard>

      <AuthDock>
        {context.canUseNativeInstallPrompt && !context.isStandalone ? (
          <BottomActionSplit
            primary={(
              <BottomDockLink href="/login" intent="positive">
                Go to login
              </BottomDockLink>
            )}
            secondary={(
              <BottomDockButton
                intent="secondary"
                loading={installPrompt.isPrompting}
                loadingLabel="Installing app..."
                onClick={() => {
                  void installPrompt.promptInstall();
                }}
                type="button"
              >
                Install app
              </BottomDockButton>
            )}
          />
        ) : (
          <BottomActionSingle>
            <BottomDockLink href="/login" intent="positive">
              Go to login
            </BottomDockLink>
          </BottomActionSingle>
        )}
      </AuthDock>
    </AuthShell>
  );
}
