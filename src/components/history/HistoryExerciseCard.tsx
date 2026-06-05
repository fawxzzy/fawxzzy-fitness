"use client";

import { useEffect, useState, type ReactNode } from "react";
import { EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME } from "@/components/ExerciseCard";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { SignatureDot, SignatureMetaTag } from "@/components/ui/app/SignatureSeparator";
import { MetricAccentBar, SurfaceMetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { resolveWorkoutCardMediaRailWidth } from "@/lib/workout-card-surface-policy";

const THIN_SECTION_TOP_DIVIDER_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_0]";
const HISTORY_EXERCISE_MEDIA_SIZE = resolveWorkoutCardMediaRailWidth("history-browser");
const HISTORY_EXERCISE_DETAIL_MEDIA_SIZE = HISTORY_EXERCISE_MEDIA_SIZE + 18;
const HISTORY_EXERCISE_SQUARE_MEDIA_CLASS_NAME = "!my-0 !min-h-0 !self-center aspect-square rounded-[1rem] border border-[rgb(var(--accent-divider-rgb)/0.16)]";

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

function HistoryExerciseDetailedMetricGrid({ items }: { items: MetricDatum[] }) {
  return <SurfaceMetricGrid items={items} />;
}

function renderDetailedBulletSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full space-y-1.5 pt-[0.45rem]", THIN_SECTION_TOP_DIVIDER_CLASS_NAME)}>
      <div className="w-full space-y-1">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
          {title}
        </p>
        <div className="space-y-2 pl-px">
          {items.map((item, index) => (
            <div key={`${title}-${item}-${index}`} className="flex min-w-0 items-start gap-2.5">
              <div className="flex h-[1.05rem] shrink-0 items-center">
                <SignatureDot />
              </div>
              <span className={cn(appTokens.workoutCardDetailCompact, "min-w-0 flex-1 leading-[1.22] text-[rgb(var(--text-primary)/0.95)] [text-wrap:pretty]")}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
  const hasMetrics = density === "detailed" && (metrics?.length ?? 0) > 0;
  const resolvedExercise = exercise ?? { name: title };
  const resolvedBadgeItems = badgeItems.length > 0 ? badgeItems : (badgeText ? [badgeText] : []);
  const resolvedMetaBadge = resolvedBadgeItems.length > 0 ? <RotatingMetaBadge items={resolvedBadgeItems} /> : null;
  const topAccentBar = hasMetrics ? <MetricAccentBar variant="thin" /> : null;
  const summaryText = comparison ? `${summary} | ${comparison}` : summary;
  const resolvedSubtitleLabel = density === "detailed" ? undefined : summaryLabel;
  const resolvedSubtitle = density === "detailed" ? undefined : summaryText;

  if (density === "detailed") {
    return (
      <div
        data-history-card="exercise"
        data-history-density={density}
        data-history-surface="history-browser"
      >
        <ExerciseCard
          title={title}
          titleMeta={resolvedMetaBadge}
          subtitleLabel={resolvedSubtitleLabel}
          subtitle={resolvedSubtitle}
          onPress={onPress}
          className={appTokens.historyExerciseCardShell}
          variant="standard"
          density="detailed"
          semanticTone={tone}
          subtitleTone="plain"
          rightIconMode="overlay"
          rightRailClassName="right-[0.85rem] top-1/2 -translate-y-1/2"
          trailingStackClassName="h-4.5 w-4.5"
          contentClassName="pl-1.5"
          titleClassName="[text-wrap:pretty]"
          titleContainerClassName="pr-[2.35rem] space-y-0.5"
          headerDivider={topAccentBar}
          disablePressScale
        >
          <div className={appTokens.historyExerciseCardDetailedStack}>
            {metadata ? (
              <div
                className={cn(
                  EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME,
                  appTokens.historyExerciseCompactMetadata,
                )}
                data-history-card-metadata="true"
              >
                {metadata}
              </div>
            ) : null}
            {hasMetrics ? (
              <div className="space-y-2.5 pt-1">
                <HistoryExerciseDetailedMetricGrid items={metrics ?? []} />
              </div>
            ) : null}
            {detailSections.length > 0 ? (
              <div
                className="grid items-start gap-x-0 pt-0.5"
                style={{ gridTemplateColumns: `minmax(0,1fr) ${HISTORY_EXERCISE_DETAIL_MEDIA_SIZE}px` }}
              >
                <div className="min-w-0 pr-1.5">
                  {detailSections.map((section) => (
                    <div key={section.title}>
                      {renderDetailedBulletSection(section)}
                    </div>
                  ))}
                </div>
                <div className="pointer-events-none ml-auto self-start overflow-hidden rounded-[1rem] border border-[rgb(var(--accent-divider-rgb)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.94)] shadow-none">
                  <div style={{ width: HISTORY_EXERCISE_DETAIL_MEDIA_SIZE, height: HISTORY_EXERCISE_DETAIL_MEDIA_SIZE }}>
                    <ExerciseThumb
                      exercise={resolvedExercise}
                      detailed={false}
                      layout="rail"
                      railWidth={HISTORY_EXERCISE_DETAIL_MEDIA_SIZE}
                      sizes={`${HISTORY_EXERCISE_DETAIL_MEDIA_SIZE}px`}
                      intent="row-card"
                      className="h-full w-full rounded-none"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </ExerciseCard>
      </div>
    );
  }

  return (
    <div
      data-history-card="exercise"
      data-history-density={density}
      data-history-surface="history-browser"
    >
      <ExerciseCard
        title={title}
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
        onPress={onPress}
        className={appTokens.historyExerciseCardShell}
        variant="interactive"
        density="compact"
        semanticTone={tone}
        mediaRailWidth={HISTORY_EXERCISE_MEDIA_SIZE}
        mediaClassName={HISTORY_EXERCISE_SQUARE_MEDIA_CLASS_NAME}
        contentClassName="pl-1.5"
        titleClassName="[text-wrap:pretty]"
        subtitleLabel={resolvedSubtitleLabel}
        subtitle={resolvedSubtitle}
        subtitleTone="plain"
      >
        <div className={cn(appTokens.historyExerciseCardCompactStack, "gap-1.5 pl-px")}>
          {metadata ? (
            <div
              className={cn(
                EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME,
                appTokens.historyExerciseCompactMetadata,
              )}
              data-history-card-metadata="true"
            >
              {metadata}
            </div>
          ) : null}
          {resolvedBadgeItems.length > 0 ? (
            <div className="pt-[1px]">
              <RotatingMetaBadge items={resolvedBadgeItems} />
            </div>
          ) : null}
        </div>
      </ExerciseCard>
    </div>
  );
}
