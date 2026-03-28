"use client";

import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionBackButton } from "@/components/SessionBackButton";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";

export function SessionHeaderControls({
  sessionTitle,
  sessionSummary,
  backHref,
}: {
  sessionTitle: string;
  sessionSummary?: string;
  backHref?: string;
}) {
  return (
    <SharedScreenHeader
      recipe="currentSession"
      className="space-y-0"
      eyebrow="Current Session"
      title={sessionTitle}
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
