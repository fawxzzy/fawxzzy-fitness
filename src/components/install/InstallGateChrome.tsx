"use client";

import type { ReactNode } from "react";
import {
  AuthAddIcon,
  AuthBody,
  AuthDockButton,
  AuthDotsIcon,
  AuthHead,
  AuthInstallSteps,
  AuthLegalRow,
  AuthShareIcon,
  AuthShell,
  AuthStatusScreen,
} from "@/components/auth/AuthShell";

export type InstallCopyState = "idle" | "copied" | "error";

/**
 * Install family (Auth Surface v2). One screen per real situation, so each one says exactly what to do there:
 * - `ios-safari`: Safari has no install action, so steps only and no button.
 * - `ios-inapp`: inside another app's browser (Instagram, Gmail...): open in Safari first; the dock copies the link.
 * - `prompt`: the browser offered its install prompt: one line, one Install button.
 * - `manual`: Android/desktop without the prompt: menu steps.
 * - `unsupported`: a browser that cannot install apps: name the ones that can.
 * - `installed`: the install just finished in this tab. No way into the app from the tab: open it from the home screen.
 */
export type InstallScreenKind = "ios-safari" | "ios-inapp" | "prompt" | "manual" | "unsupported" | "installed";

export const INSTALL_SCREEN_LEADS: Record<Exclude<InstallScreenKind, "installed">, string> = {
  "ios-safari": "Add it to your home screen to use it as an app.",
  "ios-inapp": "Open this page in Safari to install.",
  prompt: "Install it for quick access, even offline.",
  manual: "Add it to your home screen to use it as an app.",
  unsupported: "Open this page in Safari, Chrome or Edge to install.",
};

export const IOS_SAFARI_INSTALL_STEPS: readonly ReactNode[] = [
  <>Tap Share <AuthShareIcon /> in Safari.</>,
  <>Choose Add to Home Screen <AuthAddIcon />.</>,
  "Open the app from your home screen.",
];

export const IOS_IN_APP_INSTALL_STEPS: readonly ReactNode[] = [
  <>Tap <AuthDotsIcon label="More" /> then Open in Safari.</>,
  <>Tap Share <AuthShareIcon />, then Add to Home Screen.</>,
];

export const MANUAL_INSTALL_STEPS: readonly ReactNode[] = [
  <>Tap <AuthDotsIcon label="Menu" /> in your browser.</>,
  "Choose Install app.",
  "Open the app from your home screen.",
];

const STEPS_BY_KIND: Partial<Record<InstallScreenKind, readonly ReactNode[]>> = {
  "ios-safari": IOS_SAFARI_INSTALL_STEPS,
  "ios-inapp": IOS_IN_APP_INSTALL_STEPS,
  manual: MANUAL_INSTALL_STEPS,
};

export function InstallScreen({
  kind,
  copyState = "idle",
  onCopy,
  onInstall,
  isPrompting = false,
}: {
  kind: InstallScreenKind;
  copyState?: InstallCopyState;
  onCopy?: () => void;
  onInstall?: () => void;
  isPrompting?: boolean;
}) {
  if (kind === "installed") {
    return <AuthStatusScreen testId="install-installed" title="Fitness is installed" lead="Open it from your home screen." />;
  }

  const steps = STEPS_BY_KIND[kind];

  return (
    <AuthShell variant="install" testId="install-shell">
      <AuthHead title="Install Fitness" lead={INSTALL_SCREEN_LEADS[kind]} />
      <AuthBody align="top" aria-label="Install Fitness" data-install-kind={kind}>
        {steps ? <AuthInstallSteps steps={steps} /> : null}
      </AuthBody>
      <AuthLegalRow />
      {kind === "ios-inapp" ? (
        <AuthDockButton type="button" onClick={onCopy}>
          {copyState === "copied" ? "Link copied" : "Copy link"}
        </AuthDockButton>
      ) : null}
      {kind === "prompt" ? (
        <AuthDockButton type="button" onClick={onInstall} busy={isPrompting} busyLabel="Install">
          Install
        </AuthDockButton>
      ) : null}
    </AuthShell>
  );
}
