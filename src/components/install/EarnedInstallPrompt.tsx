"use client";

import { useEffect, useMemo, useState } from "react";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";
import { getInstallContext } from "@/lib/install/getInstallContext";
import {
  consumeInstallEarnedMoment,
  dismissInstallEarnedPromptForSession,
  isInstallEarnedPromptDismissedForSession,
  type InstallEarnedMoment,
} from "@/lib/install/earned-install-prompt";
import { usePWAInstallPrompt } from "@/components/install/usePWAInstallPrompt";

function getEarnedPromptCopy(moment: InstallEarnedMoment) {
  if (moment === "workout-completed") {
    return {
      eyebrow: "Workout Saved",
      title: "Install Fitness for faster return",
      body: "You finished a workout. Install Fitness to get back into Today and Session flows faster next time.",
    };
  }

  return {
    eyebrow: "Install Fitness",
    title: "Install Fitness",
    body: "Install Fitness for quicker return and a more app-like workout loop.",
  };
}

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

    const moment = consumeInstallEarnedMoment();
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

  const copy = getEarnedPromptCopy(earnedMoment);

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

  return (
    <div
      className={cn(
        appTokens.panelMuted,
        "flex flex-col gap-3 rounded-[1.35rem] border border-[rgb(var(--border-strong)/0.16)] bg-[linear-gradient(180deg,rgba(13,20,29,0.94),rgba(9,15,23,0.94))] px-4 py-4 shadow-[0_18px_48px_rgba(3,8,14,0.28)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <AppBadge tone="success">{copy.eyebrow}</AppBadge>
          <div className="space-y-1">
            <p className="text-[0.98rem] font-semibold tracking-[-0.01em] text-[rgb(var(--text-primary)/0.98)]">
              {copy.title}
            </p>
            <p className={cn(appTokens.mutedText, "text-sm leading-6")}>
              {copy.body}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissPrompt}
          className="shrink-0 rounded-full border border-[rgb(var(--border-strong)/0.16)] px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--text-muted)/0.9)] transition hover:border-[rgb(var(--accent)/0.28)] hover:text-[rgb(var(--text-primary)/0.96)]"
        >
          Dismiss
        </button>
      </div>

      {context.shouldShowIOSAddToHomeScreenGate ? (
        <ol className="space-y-1 rounded-[1rem] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-2)/0.58)] px-3.5 py-3 text-sm leading-6 text-[rgb(var(--text-secondary)/0.96)]">
          <li>1. Tap Share in Safari.</li>
          <li>2. Tap Add to Home Screen.</li>
          <li>3. Open Fitness from your Home Screen next time.</li>
        </ol>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {context.shouldShowIOSAddToHomeScreenGate ? (
          <BottomDockLink href="/install" intent="info">
            Install Help
          </BottomDockLink>
        ) : (
          <BottomDockButton
            type="button"
            intent="info"
            loading={installPrompt.isPrompting}
            loadingLabel="Installing app..."
            onClick={() => {
              void handleInstall();
            }}
          >
            Install
          </BottomDockButton>
        )}
        <BottomDockButton type="button" intent="info" onClick={dismissPrompt}>
          Not now
        </BottomDockButton>
      </div>
    </div>
  );
}
