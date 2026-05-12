import type { ReactNode } from "react";
import { EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME } from "@/components/ExerciseCard";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { SignatureDot, SignatureMetaTag } from "@/components/ui/app/SignatureSeparator";
import { MetricAccentBar, type MetricDatum } from "@/components/ui/MetricItem";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

function renderMetaBadge(value: string) {
  return (
    <SignatureMetaTag>
      {value}
    </SignatureMetaTag>
  );
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
    return <span aria-hidden="true" className="inline-block h-[2px] w-[10px] rounded-full bg-current" />;
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

export function HistoryExerciseCard({
  exercise,
  title,
  summaryLabel,
  summary,
  metadata,
  badgeText,
  metrics,
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
  metadata?: ReactNode;
  badgeText?: string;
  metrics?: MetricDatum[];
  density: "compact" | "detailed";
  tone: CardSemanticTone;
  onPress: () => void;
}) {
  const hasMetrics = density === "detailed" && (metrics?.length ?? 0) > 0;
  const resolvedExercise = exercise ?? { name: title };
  const resolvedMetaBadge = badgeText ? renderMetaBadge(badgeText) : null;
  const topAccentBar = hasMetrics ? <MetricAccentBar variant="thin" /> : null;

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
          subtitle={metadata}
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
          subtitleClassName="pt-1 text-[rgb(var(--text-secondary)/0.88)]"
          headerDivider={topAccentBar}
          disablePressScale
        >
          <div className={appTokens.historyExerciseCardDetailedStack}>
            {hasMetrics ? (
              <div className="space-y-2.5 pt-1">
                <HistoryExerciseDetailedMetricGrid items={metrics ?? []} />
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
          {badgeText ? (
            <div className="pt-[1px]">
              <SignatureMetaTag>{badgeText}</SignatureMetaTag>
            </div>
          ) : null}
        </div>
      </ExerciseCard>
    </div>
  );
}
