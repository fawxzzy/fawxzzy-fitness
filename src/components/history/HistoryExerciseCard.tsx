import type { ReactNode } from "react";
import { EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME } from "@/components/ExerciseCard";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { SignatureMetaTag } from "@/components/ui/app/SignatureSeparator";
import { MetricAccentBar, MetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

function renderMetaBadge(value: string) {
  return (
    <SignatureMetaTag>
      {value}
    </SignatureMetaTag>
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
        >
          <div className={appTokens.historyExerciseCardDetailedStack}>
            {hasMetrics ? (
              <div className="space-y-2.5 pt-1">
                <MetricAccentBar className="h-[4px] shadow-[0_0_16px_rgb(var(--accent-divider-rgb)/0.5)]" />
                <MetricGrid
                  items={metrics ?? []}
                  compact
                  autoColumns
                  className="gap-1.25"
                  labelPlacement="top"
                  labelClassName="text-[rgb(var(--accent-divider-rgb)/0.92)]"
                  itemClassName="min-h-[2.8rem] px-2.75 py-1"
                />
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
