"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AccentSubtitleText, SubtitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

const SHADOW_PLACEMENT_STORAGE_PREFIX = "fawxzzy:fitness:shadow-placement:v1:";

function buildPlacementStorageKey(sourceOutboundId: string, suffix: "impression" | "dismissed") {
  return `${SHADOW_PLACEMENT_STORAGE_PREFIX}${sourceOutboundId}:${suffix}`;
}

function readStoredFlag(key: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeStoredFlag(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Ignore local storage failures and continue with in-memory UI state.
  }
}

async function recordPilotShadowEvent(payload: {
  eventType: "impression" | "click" | "dismiss";
  sourceOutboundId: string;
  placementId: string;
  surfaceId: string;
  cohortId: string;
  destinationPath: string;
  dismissalReasonCode?: string;
}) {
  try {
    const response = await fetch("/api/ecosystem/fitness/pilot-shadow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export function TodayRecoveryShadowPlacement(props: {
  placementId: string;
  surfaceId: string;
  sourceOutboundId: string;
  cohortId: string;
  destinationHref: string;
  destinationPath: string;
}) {
  const router = useRouter();
  const [isHidden, setIsHidden] = useState(false);
  const [isPending, startTransition] = useTransition();

  const impressionStorageKey = useMemo(
    () => buildPlacementStorageKey(props.sourceOutboundId, "impression"),
    [props.sourceOutboundId],
  );
  const dismissalStorageKey = useMemo(
    () => buildPlacementStorageKey(props.sourceOutboundId, "dismissed"),
    [props.sourceOutboundId],
  );

  useEffect(() => {
    if (readStoredFlag(dismissalStorageKey)) {
      setIsHidden(true);
      return;
    }

    if (readStoredFlag(impressionStorageKey)) {
      return;
    }

    let cancelled = false;

    void recordPilotShadowEvent({
      eventType: "impression",
      sourceOutboundId: props.sourceOutboundId,
      placementId: props.placementId,
      surfaceId: props.surfaceId,
      cohortId: props.cohortId,
      destinationPath: props.destinationPath,
    }).then((ok) => {
      if (!cancelled && ok) {
        writeStoredFlag(impressionStorageKey);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    dismissalStorageKey,
    impressionStorageKey,
    props.cohortId,
    props.destinationPath,
    props.placementId,
    props.sourceOutboundId,
    props.surfaceId,
  ]);

  if (isHidden) {
    return null;
  }

  return (
    <div id="today-recovery-shadow-placement">
      <ScreenScaffold recipe="todayOverview" className="w-full">
      <SharedSectionShell
        recipe="todayOverview"
        label="Recovery reset follow-up"
        action={<AppBadge tone="warning">Shadow only</AppBadge>}
        bodyClassName="flex flex-col gap-[0.75rem]"
        summary={(
          <AccentSubtitleText className="rounded-[var(--radius-md)] border border-[rgb(var(--warning-rgb)/0.22)] bg-[rgb(var(--warning-rgb)/0.12)] px-3 py-2 text-xs text-[rgb(255_243_225)]">
            This banner is measuring a recovery-reset placement for the current shadow cohort only. No live widening happens here.
          </AccentSubtitleText>
        )}
        footer={(
          <div className="flex flex-wrap gap-[0.5rem]">
            <button
              type="button"
              className={cn(
                "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border border-[rgb(var(--accent)/0.34)] bg-[rgb(var(--accent)/0.18)] px-4 text-sm font-semibold text-[rgb(var(--text-primary))] transition-colors hover:bg-[rgb(var(--accent)/0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]",
                isPending && "cursor-wait opacity-70",
              )}
              onClick={() => {
                startTransition(async () => {
                  await recordPilotShadowEvent({
                    eventType: "click",
                    sourceOutboundId: props.sourceOutboundId,
                    placementId: props.placementId,
                    surfaceId: props.surfaceId,
                    cohortId: props.cohortId,
                    destinationPath: props.destinationPath,
                  });
                  router.push(props.destinationHref);
                });
              }}
            >
              {isPending ? "Opening..." : "Review recovery reset"}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-3-rgb)/0.88)] px-4 text-sm font-medium text-[rgb(var(--text-primary)/0.88)] transition-colors hover:bg-[rgb(var(--surface-2)/0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
              onClick={() => {
                startTransition(async () => {
                  const ok = await recordPilotShadowEvent({
                    eventType: "dismiss",
                    sourceOutboundId: props.sourceOutboundId,
                    placementId: props.placementId,
                    surfaceId: props.surfaceId,
                    cohortId: props.cohortId,
                    destinationPath: props.destinationPath,
                    dismissalReasonCode: "member_dismissed",
                  });

                  if (ok) {
                    writeStoredFlag(dismissalStorageKey);
                  }

                  setIsHidden(true);
                });
              }}
            >
              Dismiss
            </button>
          </div>
        )}
      >
        <div className="flex flex-col gap-[0.5rem]">
          <SubtitleText>
            Today looks like a recovery-risk moment with open weekly progress still available. Keep the placement shadowed and measure whether members choose the recovery reset path before any live pilot.
          </SubtitleText>
          <div className="flex flex-wrap gap-[0.5rem]">
            <AppBadge tone="warning">High intent</AppBadge>
            <AppBadge tone="success">{props.cohortId.includes("treatment_shadow") ? "Treatment shadow" : "Shadow cohort"}</AppBadge>
          </div>
        </div>
      </SharedSectionShell>
      </ScreenScaffold>
    </div>
  );
}
