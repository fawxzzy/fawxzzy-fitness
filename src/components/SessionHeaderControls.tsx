"use client";

import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionBackButton } from "@/components/SessionBackButton";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";

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
    <AppPanel className="space-y-0 rounded-[1.8rem] border-white/14 shadow-[0_20px_42px_rgba(0,0,0,0.28)]">
      <AppHeader
        eyebrow="Current Session"
        title={sessionTitle}
        subtitle={sessionSummary}
        leading={<SessionBackButton href={backHref} />}
      />
      <div className="px-5 pb-4">
        <OfflineSyncBadge />
      </div>
    </AppPanel>
  );
}
