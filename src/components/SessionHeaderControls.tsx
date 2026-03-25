"use client";

import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionBackButton } from "@/components/SessionBackButton";
import { SessionHeaderCard } from "@/components/ui/workout-entry/SessionHeaderCard";

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
    <div className="sticky top-0 z-40 px-1 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <SessionHeaderCard
        eyebrow="Current Session"
        title={sessionTitle}
        subtitle={sessionSummary}
        action={<SessionBackButton href={backHref} />}
        footer={<OfflineSyncBadge />}
      />
    </div>
  );
}
