"use client";

import { useMemo, useState } from "react";
import { ExerciseSurfaceMetricGrid } from "@/components/exercises/ExerciseSurfaceMetricGrid";
import { DetailSectionItems } from "@/components/ui/DetailSectionList";
import { PillButton } from "@/components/ui/Pill";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import type { MetricDatum } from "@/components/ui/MetricItem";
import type { ProgressionSummaryActivityBucket } from "@/lib/progression-summary-activity";

function buildChangeMixMetrics(bucket: ProgressionSummaryActivityBucket | null) {
  if (!bucket) {
    return [] satisfies MetricDatum[];
  }

  return [
    {
      label: "Promotions",
      value: String(bucket.promotionCount),
      valueTone: bucket.promotionCount > 0 ? "success" : "muted",
    },
    {
      label: "Regressed",
      value: String(bucket.deloadCount),
      valueTone: bucket.deloadCount > 0 ? "danger" : "muted",
    },
    {
      label: "Manual",
      value: String(bucket.manualChangeCount),
      valueTone: bucket.manualChangeCount > 0 ? "default" : "muted",
    },
    {
      label: "Reverted",
      value: String(bucket.revertCount),
      valueTone: bucket.revertCount > 0 ? "default" : "muted",
    },
  ] satisfies MetricDatum[];
}

const SECTION_HEADING_CLASS_NAME = "px-2 pt-0.5 text-center text-[0.82rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.96)]";

export function ProgressionSummaryActivityPanel({
  activityBuckets,
  hotspotItems,
  emptyHotspotCopy,
}: {
  activityBuckets: ProgressionSummaryActivityBucket[];
  hotspotItems: string[];
  emptyHotspotCopy: string;
}) {
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const orderedBuckets = useMemo(
    () => [...activityBuckets].sort((left, right) => left.id.localeCompare(right.id)),
    [activityBuckets],
  );
  const selectedBucket = orderedBuckets.find((bucket) => bucket.id === selectedBucketId) ?? null;
  const maxEventCount = orderedBuckets.reduce((current, bucket) => Math.max(current, bucket.eventCount), 0);
  const displayedBucket = selectedBucket ?? orderedBuckets[orderedBuckets.length - 1] ?? null;
  const changeMixMetrics = useMemo(() => buildChangeMixMetrics(displayedBucket), [displayedBucket]);
  const resolvedHotspotItems = selectedBucket?.hotspotItems?.length
    ? selectedBucket.hotspotItems
    : hotspotItems;
  const selectedSummaryParts = selectedBucket
    ? [selectedBucket.detail, selectedBucket.valueLabel].filter((part): part is string => Boolean(part?.trim()))
    : [];

  if (orderedBuckets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <p className={SECTION_HEADING_CLASS_NAME}>Progression Activity</p>
        {selectedBucket ? (
          <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
            <div className="space-y-2.5">
              <div className="relative min-h-[1.9rem] px-0.5">
                <PillButton
                  active
                  type="button"
                  onClick={() => setSelectedBucketId(null)}
                  className="absolute left-0 top-1/2 min-h-[1.7rem] -translate-y-1/2 px-2 py-[3px] text-[9px] tracking-[0.14em]"
                >
                  <ChevronRightIcon className="h-3.5 w-3.5 rotate-180 text-[rgb(var(--accent-divider-rgb)/0.96)]" />
                  Back
                </PillButton>
                <p className={cn(SECTION_HEADING_CLASS_NAME, "px-8")}>{selectedBucket.label}</p>
              </div>
              {selectedSummaryParts.length > 0 ? (
                <div className="px-0.5">
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[0.76rem] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.86)]">
                    {selectedSummaryParts.map((part) => (
                      <span key={part}>{part}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              <DetailSectionItems items={selectedBucket.items} className="pl-0.5" showBullets={false} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {orderedBuckets.map((bucket) => {
              const widthPercent = maxEventCount > 0
                ? Math.max((bucket.eventCount / maxEventCount) * 100, bucket.eventCount > 0 ? 8 : 0)
                : 0;

              return (
                <button
                  key={bucket.id}
                  type="button"
                  onClick={() => setSelectedBucketId(bucket.id)}
                  className="w-full rounded-[1rem] border border-[rgb(var(--border-rgb)/0.42)] bg-[rgb(var(--surface-2-rgb)/0.14)] px-3.5 py-3 text-left transition-colors hover:border-[rgb(var(--accent-strong)/0.45)] hover:bg-[rgb(var(--surface-2-rgb)/0.22)]"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary)/0.95)]">{bucket.label}</p>
                        {bucket.detail ? (
                          <p className="text-[0.75rem] leading-5 text-[rgb(var(--text-muted)/0.88)]">{bucket.detail}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.86)]">
                          {bucket.valueLabel}
                        </p>
                        <ChevronRightIcon className="h-4 w-4 text-[rgb(var(--text-muted)/0.92)]" />
                      </div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(var(--surface-3-rgb)/0.42)]">
                      <div
                        className="h-full rounded-full bg-[rgb(var(--accent-strong)/0.72)] transition-[width] duration-300"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {changeMixMetrics.length > 0 ? (
        <div className="space-y-1.5">
          <p className={SECTION_HEADING_CLASS_NAME}>Changes</p>
          <ExerciseSurfaceMetricGrid items={changeMixMetrics} />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <p className={SECTION_HEADING_CLASS_NAME}>Promotion Hotspots</p>
        {resolvedHotspotItems.length > 0 ? (
          <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
            <DetailSectionItems items={resolvedHotspotItems} className="pl-0.5" />
          </div>
        ) : (
          <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
            <p className={appTokens.detailBodyMutedText}>{emptyHotspotCopy}</p>
          </div>
        )}
      </div>
    </div>
  );
}
