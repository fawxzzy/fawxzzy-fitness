"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import { AuthCard, AuthIntro, AuthMessage, AuthShell } from "@/components/auth/AuthShell";
import { PrimaryButton } from "@/components/ui/AppButton";
import { useInstallContext } from "@/hooks/useInstallContext";

type InstallEntryGateProps = {
  continueHref: string;
};

function getSubtitle({
  capability,
  nativePromptAvailable,
}: {
  capability: "native-prompt" | "manual" | "unsupported";
  nativePromptAvailable: boolean;
}) {
  if (nativePromptAvailable) {
    return "Install the app first for the cleanest full-screen workout flow.";
  }

  if (capability === "manual") {
    return "Add it to your home screen first, or continue in the browser if you need to get moving now.";
  }

  if (capability === "native-prompt") {
    return "Chrome or Edge will enable install once the browser finishes its installability checks.";
  }

  return "This browser cannot trigger app install directly, so use a supported install flow or continue in the browser.";
}

export function InstallEntryGate({ continueHref }: InstallEntryGateProps) {
  const router = useRouter();
  const {
    capability,
    isReady,
    isStandalone,
    manualInstructions,
    nativePromptAvailable,
    platform,
    promptInstall,
  } = useInstallContext();
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !isStandalone) {
      return;
    }

    startTransition(() => {
      router.replace(continueHref);
    });
  }, [continueHref, isReady, isStandalone, router]);

  const subtitle = useMemo(
    () => getSubtitle({ capability, nativePromptAvailable }),
    [capability, nativePromptAvailable],
  );

  if (!isReady || isStandalone) {
    return (
      <AuthShell className="justify-center">
        <section className="glass-surface glass-sheen rounded-[1.5rem] border border-white/10 px-5 py-5 text-center shadow-[0_20px_44px_rgba(0,0,0,0.28)]">
          <p className="text-sm text-slate-300">Opening FawxzzyFitness...</p>
        </section>
      </AuthShell>
    );
  }

  const showContinueLink = !nativePromptAvailable;
  const showNativePromptButton = capability === "native-prompt";
  const manualInstallDetails = capability === "manual" ? manualInstructions : null;
  const unsupportedBrowserMessage =
    platform === "unsupported"
      ? "Install is available from Chromium browsers on desktop and Android, or from Safari on iPhone and iPad."
      : null;

  async function handleNativeInstall() {
    const outcome = await promptInstall();

    if (outcome === "accepted") {
      setStatusMessage("Install accepted. Open FawxzzyFitness from your home screen or app list to continue.");
      return;
    }

    if (outcome === "dismissed") {
      setStatusMessage("Install was dismissed. You can continue in the browser below.");
      return;
    }

    setStatusMessage("Install is not available yet. Continue in the browser if you need access right away.");
  }

  return (
    <AuthShell>
      <AuthIntro
        eyebrow="Install First"
        title="Install FawxzzyFitness"
        subtitle={subtitle}
      />

      <AuthCard className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">Browser entry stays install-first.</p>
          <p className="text-sm leading-6 text-slate-300">
            Installed launches skip this screen automatically, so the in-app flow stays unchanged once the app is on the device.
          </p>
        </div>

        {showNativePromptButton ? (
          <div className="space-y-3">
            <PrimaryButton
              type="button"
              fullWidth
              onClick={handleNativeInstall}
              disabled={!nativePromptAvailable}
            >
              {nativePromptAvailable ? "Install app" : "Install app unavailable yet"}
            </PrimaryButton>
            {!nativePromptAvailable ? (
              <p className="text-xs leading-5 text-slate-400">
                The button enables only after Chromium exposes `beforeinstallprompt` for this visit.
              </p>
            ) : null}
          </div>
        ) : null}

        {manualInstallDetails ? (
          <div className="space-y-3">
            <PrimaryButton
              type="button"
              fullWidth
              onClick={() => setShowManualInstructions((current) => !current)}
            >
              {showManualInstructions ? "Hide install steps" : manualInstallDetails.ctaLabel}
            </PrimaryButton>

            {showManualInstructions ? (
              <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                <p className="text-sm font-semibold text-white">{manualInstallDetails.platformLabel}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-300">
                  {manualInstallDetails.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="mt-3 text-xs leading-5 text-slate-400">{manualInstallDetails.helperText}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {statusMessage ? <AuthMessage>{statusMessage}</AuthMessage> : null}
        {unsupportedBrowserMessage ? <AuthMessage>{unsupportedBrowserMessage}</AuthMessage> : null}

        {showContinueLink ? (
          <div className="border-t border-white/10 pt-3">
            <Link
              href={continueHref}
              className="block text-center text-xs font-medium tracking-[0.08em] text-slate-300 underline-offset-4 hover:text-white hover:underline"
            >
              Continue in browser
            </Link>
          </div>
        ) : null}
      </AuthCard>
    </AuthShell>
  );
}
