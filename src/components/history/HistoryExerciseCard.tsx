"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { HistoryDetailExerciseCard } from "@/components/history/HistoryDetailExerciseCard";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { SignatureDot, SignatureMetaTag } from "@/components/ui/app/SignatureSeparator";
import { type MetricDatum } from "@/components/ui/MetricItem";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { resolveWorkoutCardMediaRailWidth } from "@/lib/workout-card-surface-policy";

const HISTORY_EXERCISE_MEDIA_SIZE = resolveWorkoutCardMediaRailWidth("history-browser");
const HISTORY_EXERCISE_DETAIL_MEDIA_WIDTH = HISTORY_EXERCISE_MEDIA_SIZE + 32;
function renderMetaBadge(value: string) {
  return (
    <SignatureMetaTag>
      {value}
    </SignatureMetaTag>
  );
}

function RotatingMetaBadge({
  items,
}: {
  items: string[];
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) {
      setIndex(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [items]);

  const current = items[index] ?? items[0] ?? null;
  return current ? renderMetaBadge(current) : null;
}

export function HistoryExerciseCard({
  exercise,
  title,
  summaryLabel,
  summary,
  comparison,
  metadata,
  badgeText,
  badgeItems = [],
  metrics,
  detailSections = [],
  density,
  tone,
  onPress,
}: {
  exercise?: {
    name: string;
    slug?: string | null;
    image_path?: string | null;
    image_icon_path?: string | null;
    image_howto_path?: string | null;
  };
  title: string;
  summaryLabel: string;
  summary: string;
  comparison?: string | null;
  metadata?: ReactNode;
  badgeText?: string;
  badgeItems?: string[];
  metrics?: MetricDatum[];
  detailSections?: Array<{
    title: string;
    items: string[];
  }>;
  density: "compact" | "detailed";
  tone: CardSemanticTone;
  onPress: () => void;
}) {
  const resolvedExercise = exercise ?? { name: title };
  const resolvedBadgeItems = badgeItems.length > 0 ? badgeItems : (badgeText ? [badgeText] : []);
  const summaryText = comparison ? `${summary} | ${comparison}` : summary;
  const resolvedSubtitleLabel = summaryLabel;
  const resolvedSubtitle = summaryText;

  if (density === "detailed") {
    return (
      <div
        data-history-card="exercise"
        data-history-density={density}
        data-history-surface="history-browser"
      >
        <HistoryDetailExerciseCard
          exercise={resolvedExercise}
          summary={resolvedSubtitle}
          summaryLabel={resolvedSubtitleLabel}
          metadata={metadata}
          badgeText={badgeText}
          badgeItems={resolvedBadgeItems}
          metrics={metrics}
          density="detailed"
          tone={tone}
          leadingVisual={(
            <ExerciseThumb
              exercise={resolvedExercise}
              detailed={false}
              layout="inline"
              width={HISTORY_EXERCISE_DETAIL_MEDIA_WIDTH}
              height={HISTORY_EXERCISE_DETAIL_MEDIA_WIDTH}
              sizes={`${HISTORY_EXERCISE_DETAIL_MEDIA_WIDTH}px`}
              fitOverride="contain"
              intent="row-card"
              className="h-full w-full rounded-[0.8rem] border border-[rgb(var(--accent-divider-rgb)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.92)]"
            />
          )}
          mediaRailWidthOverride={HISTORY_EXERCISE_DETAIL_MEDIA_WIDTH}
          detailSections={detailSections}
          expanded={false}
          onPress={onPress}
        />
      </div>
    );
  }

  return (
    <div
      data-history-card="exercise"
      data-history-density={density}
      data-history-surface="history-browser"
    >
      <HistoryDetailExerciseCard
        exercise={resolvedExercise}
        summary={resolvedSubtitle}
        summaryLabel={resolvedSubtitleLabel}
        metadata={metadata}
        badgeText={badgeText}
        badgeItems={resolvedBadgeItems}
        density="compact"
        tone={tone}
        surface="history-browser"
        dataSurface="history-browser"
        combineCompactSummaryLabel={false}
        compactBadgePlacement="stack"
        leadingVisual={(
          <ExerciseThumb
            exercise={resolvedExercise}
            detailed={false}
            layout="rail"
            railWidth={HISTORY_EXERCISE_MEDIA_SIZE}
            sizes={`${HISTORY_EXERCISE_MEDIA_SIZE}px`}
            intent="row-card"
          />
        )}
        mediaRailWidthOverride={HISTORY_EXERCISE_MEDIA_SIZE}
        footerContent={resolvedBadgeItems.length > 0 ? (
          <div className="pt-[1px]">
            <RotatingMetaBadge items={resolvedBadgeItems} />
          </div>
        ) : null}
        expanded={false}
        onPress={onPress}
      />
    </div>
  );
}
