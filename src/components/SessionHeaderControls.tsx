"use client";

import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionBackButton } from "@/components/SessionBackButton";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";

export function SessionHeaderControls({
  routineName,
  sessionDayName,
  sessionSummary,
  backHref,
}: {
  routineName: string;
  sessionDayName: string;
  sessionSummary?: string;
  backHref?: string;
}) {
  return (
    <SharedScreenHeader
      recipe="currentSession"
      eyebrow="Today"
      title={routineName}
      subtitle={sessionDayName}
      meta={sessionSummary}
      action={(
        <div className="flex items-center gap-2">
          <OfflineSyncBadge />
          <SessionBackButton href={backHref} />
        </div>
      )}
    />
  );
}
