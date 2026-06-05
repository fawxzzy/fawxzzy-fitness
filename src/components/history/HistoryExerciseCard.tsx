"use client";

import { useEffect, useState, type ReactNode } from "react";
import { EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME } from "@/components/ExerciseCard";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { SignatureDot, SignatureMetaTag } from "@/components/ui/app/SignatureSeparator";
import { MetricAccentBar, type MetricDatum } from "@/components/ui/MetricItem";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

const THIN_SECTION_TOP_DIVIDER_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_0]";

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

function getAutoMetricSpanClassName(totalItems: number, index: number) {
  if (totalItems <= 1) return "col-span-6";
  if (totalItems === 2) return "col-span-3";
  if (totalItems === 3) return "col-span-2";

  const remainder = totalItems % 3;
  const tailStart = totalItems - remainder;

  if (remainder === 1 && index === totalItems - 1) {
    return "col-span-2 col-start-3";
  }

  if (remainder === 2 && index >= tailStart) {
    return "col-span-3";
  }

  return "col-span-2";
}

function resolveMetricValueToneClassName(tone: MetricDatum["valueTone"]) {
  switch (tone) {
    case "success":
      return "text-[rgb(var(--success-rgb)/0.94)]";
    case "danger":
      return "text-[rgb(255,116,116)]";
    case "muted":
      return "text-[rgb(var(--text-secondary)/0.82)]";
    default:
      return "text-[rgb(var(--text-primary)/0.96)]";
  }
}

function renderMetricValuePrefix(valuePrefix: string | null | undefined) {
  if (!valuePrefix) {
    return null;
  }

  if (valuePrefix === "\u2191" || valuePrefix === "â†‘") {
    return <span aria-hidden="true" className="inline-block h-0 w-0 border-x-[5px] border-x-transparent border-b-[7px] border-b-current translate-y-[-1px]" />;
  }

  if (valuePrefix === "\u2193" || valuePrefix === "â†“") {
    return <span aria-hidden="true" className="inline-block h-0 w-0 border-x-[5px] border-x-transparent border-t-[7px] border-t-current translate-y-[1px]" />;
  }

  if (valuePrefix === "\u2192" || valuePrefix === "â†’") {
    return <span aria-hidden="true" className="inline-block h-[2px] w-[10px] rounded-full bg-[rgb(var(--accent-yellow-on))]" />;
  }

  return <span aria-hidden="true">{valuePrefix}</span>;
}

function renderMetricMetaLine(parts: string[]) {
  if (parts.length === 0) {
    return null;
  }

  return (
    <div className={cn(appTokens.workoutMetricMeta, "mt-0 justify-center px-px leading-[1.02] flex flex-wrap items-center gap-x-2 gap-y-1")}>
      {parts.map((part, index) => (
        <div key={`${part}-${index}`} className="flex min-w-0 items-center gap-2">
          {index > 0 ? <SignatureDot /> : null}
          <p className="min-w-0">{part}</p>
        </div>
      ))}
    </div>
  );
}

function HistoryExerciseDetailedMetricGrid({ items }: { items: MetricDatum[] }) {
  return (
    <div className="grid grid-cols-6 gap-1.25">
      {items.map((item, index) => {
        const metaParts = [item.delta, item.timeframe, item.trend].filter((part): part is string => Boolean(part));
        return (
          <div
            key={`${item.label}-${item.value}-${index}`}
            className={cn(
              getAutoMetricSpanClassName(items.length, index),
              appTokens.workoutMetricChrome,
              appTokens.workoutMetricCompact,
              "flex min-h-[2.8rem] flex-col items-center justify-start overflow-hidden border-transparent bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_100%] px-2.75 py-1 shadow-none ring-0 backdrop-blur-0",
            )}
          >
            <p className={cn(appTokens.workoutMetricLabel, "block w-full px-px pt-px text-center leading-[1.02] text-[rgb(var(--accent-divider-rgb)/0.92)]")}>
              {item.label}
            </p>
            <div className="mt-[2px] flex w-full min-h-0 justify-center self-start pb-[0.7rem]">
              <div className="flex w-fit min-w-0 max-w-full flex-col items-center justify-start text-center">
                <p className={cn(appTokens.workoutMetricValue, appTokens.workoutMetricValueCompact, "mt-0 block px-px leading-[0.98]")}>
                  <span className={cn("inline-flex flex-wrap items-center gap-1.5", resolveMetricValueToneClassName(item.valueTone))}>
                    {renderMetricValuePrefix(item.valuePrefix)}
                    <span>{item.value}</span>
                  </span>
                </p>
                {renderMetricMetaLine(metaParts)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
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
              <div className="grid grid-cols-[minmax(0,1fr)_72px] items-stretch gap-x-0 pt-0.5">
                <div className="min-w-0 pr-2.5">
                  {detailSections.map((section) => (
                    <div key={section.title}>
                      {renderDetailedBulletSection(section)}
                    </div>
                  ))}
                </div>
                <div className="pointer-events-none -mb-[var(--exercise-row-shell-padding-y-detailed)] -mr-[var(--exercise-row-shell-padding-x)] self-stretch overflow-hidden rounded-tl-[0.95rem] border-l border-t border-[rgb(var(--accent-divider-rgb)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.94)] shadow-none">
                  <ExerciseThumb
                    exercise={resolvedExercise}
                    detailed={false}
                    layout="rail"
                    railWidth={72}
                    sizes="72px"
                    intent="row-card"
                    className="h-full w-full rounded-none"
                  />
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
        leadingVisual={
          <ExerciseThumb
            exercise={resolvedExercise}
            detailed={false}
            layout="rail"
            railWidth={72}
            sizes="72px"
            intent="row-card"
          />
        }
        onPress={onPress}
        className={appTokens.historyExerciseCardShell}
        variant="interactive"
        density="compact"
        semanticTone={tone}
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
