"use client";

import type { ReactNode } from "react";
import { AppButton } from "@/components/ui/AppButton";

/**
 * The quiet state of a Settings card whose data is not here: loading, offline or failed to load. Plain neutral text
 * (never red; the failure itself is announced once through the in-flow notice by the caller) and, when `onRetry` is
 * given, a secondary Retry button a thumb can hit.
 */
export function SettingsLoadState({
  kind,
  children,
  onRetry,
}: {
  kind: "loading" | "offline" | "error";
  children: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-2" data-settings-load-state={kind}>
      <p className="m-0 text-sm leading-snug text-[rgb(var(--text-secondary)/0.95)]" role="status">{children}</p>
      {onRetry ? (
        <AppButton type="button" variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </AppButton>
      ) : null}
    </div>
  );
}
