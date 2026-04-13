"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { AuthCard, AuthIntro, AuthMessage, AuthShell, AuthStatusCard } from "@/components/auth/AuthShell";
import { PrimaryButton } from "@/components/ui/AppButton";
import { useInstallContext } from "@/hooks/useInstallContext";

type InstallEntryGateProps = {
  continueHref: string;
};

function getIntroCopy(primaryAction: ReturnType<typeof useInstallContext>["primaryAction"]) {
  if (primaryAction?.kind === "install") {
    return {
      eyebrow: "Install First",
      title: "Install FawxzzyFitness",
      subtitle: "Install the app now for the cleanest full-screen workout flow.",
    };
  }

  if (primaryAction?.kind === "show-steps") {
    return {
      eyebrow: "Add to Home Screen",
      title: "Add FawxzzyFitness on iPhone or iPad",
      subtitle: "Safari installs this app through Add to Home Screen. Open the steps below, then launch from the new icon.",
    };
  }

  if (primaryAction?.kind === "open-safari") {
    return {
      eyebrow: "Open in Safari",
      title: "Move this page to Safari first",
      subtitle: "This iPhone or iPad browser cannot install the app in place. Open Safari first, then use Add to Home Screen.",
    };
  }

  return {
    eyebrow: "Browser Access",
    title: "Continue in your browser",
    subtitle: "Install is not available from this browser right now, so continue here or switch to a supported install flow later.",
  };
}

export function InstallEntryGate({ continueHref }: InstallEntryGateProps) {
  const router = useRouter();
  const {
    isReady,
    isStandalone,
    manualInstructions,
    nativePromptAvailable,
    platform,
    primaryAction,
    promptInstall,
  } = useInstallContext();
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const manualInstructionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isReady || !isStandalone) {
      return;
    }

    startTransition(() => {
      router.replace(continueHref);
    });
  }, [continueHref, isReady, isStandalone, router]);

  const introCopy = useMemo(() => getIntroCopy(primaryAction), [primaryAction]);

  if (!isReady || isStandalone) {
    return (
      <AuthShell className="justify-center">
        <AuthStatusCard
          title="Opening FawxzzyFitness"
          description="Checking the cleanest install-aware entry for this device."
          testId="install-entry-loading"
        />
      </AuthShell>
    );
  }

  const showContinueLink = primaryAction?.kind !== "continue-browser";
  const manualInstallDetails = manualInstructions;
  const unsupportedBrowserMessage =
    platform === "unsupported"
      ? "Install prompts are available from Chromium browsers on desktop and Android. On iPhone and iPad, use Safari and Add to Home Screen."
      : null;

  function revealManualInstructions() {
    setShowManualInstructions(true);

    window.requestAnimationFrame(() => {
      manualInstructionsRef.current?.focus();
      manualInstructionsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }

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

  function handleContinueInBrowser() {
    startTransition(() => {
      router.push(continueHref);
    });
  }

  function handlePrimaryAction() {
    if (!primaryAction) {
      return;
    }

    if (primaryAction.kind === "install") {
      void handleNativeInstall();
      return;
    }

    if (primaryAction.kind === "show-steps" || primaryAction.kind === "open-safari") {
      revealManualInstructions();
      return;
    }

    handleContinueInBrowser();
  }

  return (
    <AuthShell>
      <div className="space-y-5" data-testid="install-entry-gate">
        <AuthIntro
          eyebrow={introCopy.eyebrow}
          title={introCopy.title}
          subtitle={introCopy.subtitle}
        />

        <AuthCard className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">
              {primaryAction?.kind === "continue-browser" ? "Browser entry stays available." : "Browser entry stays install-aware."}
            </p>
            <p className="text-sm leading-6 text-slate-300">
              Installed launches skip this screen automatically, so the standalone workout flow stays unchanged once the app is on the device.
            </p>
          </div>

          {primaryAction ? (
            <PrimaryButton
              type="button"
              fullWidth
              onClick={handlePrimaryAction}
              disabled={primaryAction.kind === "install" && !nativePromptAvailable}
              data-testid="install-entry-primary"
            >
              {primaryAction.label}
            </PrimaryButton>
          ) : null}

          {manualInstallDetails ? (
            <div className="space-y-3">
              {showManualInstructions ? (
                <div
                  ref={manualInstructionsRef}
                  tabIndex={-1}
                  data-testid="install-manual-steps"
                  className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4 outline-none"
                >
                  <p className="text-sm font-semibold text-white">{manualInstallDetails.platformLabel}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-300">
                    {manualInstallDetails.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p className="mt-3 text-xs leading-5 text-slate-400">{manualInstallDetails.helperText}</p>
                  <button
                    type="button"
                    className="mt-3 text-xs font-medium tracking-[0.08em] text-slate-300 underline-offset-4 hover:text-white hover:underline"
                    onClick={() => setShowManualInstructions(false)}
                  >
                    Hide steps
                  </button>
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
                data-testid="install-entry-continue"
              >
                Continue in browser
              </Link>
            </div>
          ) : null}
        </AuthCard>
      </div>
    </AuthShell>
  );
}
