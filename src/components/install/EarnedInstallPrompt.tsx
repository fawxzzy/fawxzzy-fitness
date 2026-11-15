"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthAppIcon, AuthInstallSteps } from "@/components/auth/AuthShell";
import { INSTALL_SCREEN_LEADS, IOS_SAFARI_INSTALL_STEPS } from "@/components/install/InstallGateChrome";
import { cn } from "@/lib/cn";
import { getInstallContext } from "@/lib/install/getInstallContext";
import {
  consumeInstallEarnedMoment,
  dismissInstallEarnedPromptForSession,
  isInstallEarnedPromptDismissedForSession,
  recordInstallReturnVisit,
  type InstallEarnedMoment,
} from "@/lib/install/earned-install-prompt";
import { usePWAInstallPrompt } from "@/components/install/usePWAInstallPrompt";

export function EarnedInstallPrompt({ className }: { className?: string }) {
  const installPrompt = usePWAInstallPrompt();
  const [earnedMoment, setEarnedMoment] = useState<InstallEarnedMoment | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const context = useMemo(
    () => getInstallContext({ canUseNativeInstallPrompt: installPrompt.canPromptInstall }),
    [installPrompt.canPromptInstall],
  );

  useEffect(() => {
    if (isInstallEarnedPromptDismissedForSession()) {
      consumeInstallEarnedMoment();
      return;
    }

    const moment = consumeInstallEarnedMoment() ?? recordInstallReturnVisit();
    if (!moment) {
      return;
    }

    setEarnedMoment(moment);
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (context.isStandalone || installPrompt.isInstalled) {
      setIsVisible(false);
    }
  }, [context.isStandalone, installPrompt.isInstalled]);

  const shouldShow = isVisible
    && earnedMoment !== null
    && !context.isStandalone
    && !installPrompt.isInstalled
    && !context.shouldBlockAppAccess
    && !context.shouldShowIOSOpenInSafariGate
    && (context.canUseNativeInstallPrompt || context.shouldShowIOSAddToHomeScreenGate);

  if (!shouldShow || earnedMoment === null) {
    return null;
  }

  const dismissPrompt = () => {
    dismissInstallEarnedPromptForSession();
    setIsVisible(false);
  };

  const handleInstall = async () => {
    const outcome = await installPrompt.promptInstall();
    if (outcome === "accepted") {
      setIsVisible(false);
      return;
    }

    if (outcome === "dismissed") {
      dismissPrompt();
    }
  };

  // Same family as /install: icon, title, one line, the iPhone steps when Safari has no install action, two pills.
  return (
    <section className={cn("fx-earned", className)} aria-label="Install Fitness" data-earned-moment={earnedMoment} data-testid="earned-install-prompt">
      <AuthAppIcon placement="mark" />
      <h2 className="fx-ttl">Install Fitness</h2>
      <p className="fx-lead">{context.shouldShowIOSAddToHomeScreenGate ? INSTALL_SCREEN_LEADS["ios-safari"] : INSTALL_SCREEN_LEADS.prompt}</p>
      {context.shouldShowIOSAddToHomeScreenGate ? <AuthInstallSteps steps={IOS_SAFARI_INSTALL_STEPS} /> : null}
      <div className="fx-earned__actions" style={context.shouldShowIOSAddToHomeScreenGate ? { gridTemplateColumns: "1fr" } : undefined}>
        {context.shouldShowIOSAddToHomeScreenGate ? null : (
          <button
            type="button"
            className="fx-dock"
            disabled={installPrompt.isPrompting}
            aria-busy={installPrompt.isPrompting || undefined}
            onClick={() => {
              void handleInstall();
            }}
          >
            Install
          </button>
        )}
        <button type="button" className="fx-dock fx-dock--ghost" onClick={dismissPrompt}>
          Not now
        </button>
      </div>
    </section>
  );
}
