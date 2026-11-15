"use client";

import { AuthDockButton } from "@/components/auth/AuthShell";

type InstallAppButtonProps = {
  canPromptInstall: boolean;
  isPrompting: boolean;
  onInstall: () => Promise<void>;
};

export function InstallAppButton({
  canPromptInstall,
  isPrompting,
  onInstall,
}: InstallAppButtonProps) {
  if (!canPromptInstall) {
    return null;
  }

  return (
    <AuthDockButton
      type="button"
      busy={isPrompting}
      busyLabel="Install"
      onClick={() => {
        void onInstall();
      }}
    >
      Install
    </AuthDockButton>
  );
}
