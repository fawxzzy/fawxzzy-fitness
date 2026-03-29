"use client";

import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { SignOutButton } from "@/components/SignOutButton";

export function SettingsBottomSignOutAction() {
  return (
    <PublishBottomActions>
      <BottomActionSingle>
        <SignOutButton />
      </BottomActionSingle>
    </PublishBottomActions>
  );
}
