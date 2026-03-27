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
      action={<SessionBackButton href={backHref} />}
    >
      <div className="px-5 pb-4">
        <OfflineSyncBadge />
      </div>
    </SharedScreenHeader>
  );
}
