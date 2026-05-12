"use client";

import { AppButton } from "@/components/ui/AppButton";

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
    <AppButton
      fullWidth
      loading={isPrompting}
      onClick={() => {
        void onInstall();
      }}
      variant="primary"
    >
      Install app
    </AppButton>
  );
}
