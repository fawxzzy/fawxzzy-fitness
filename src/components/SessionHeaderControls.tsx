"use client";

import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionBackButton } from "@/components/SessionBackButton";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";

export function SessionHeaderControls({
  routineName,
  sessionSummary,
  backHref,
}: {
  routineName: string;
  sessionSummary?: string;
  backHref?: string;
}) {
  return (
    <SharedScreenHeader
      recipe="currentSession"
      title={routineName}
      subtitle={sessionSummary}
      action={(
        <div className="flex items-center gap-2">
          <OfflineSyncBadge />
          <SessionBackButton href={backHref} />
        </div>
      )}
    />
  );
}
