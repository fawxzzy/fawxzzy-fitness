import type { ReactNode } from "react";
import { EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME } from "@/components/ExerciseCard";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { appTokens } from "@/components/ui/app/tokens";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { cn } from "@/lib/cn";

type HistoryDetailExerciseCardProps = {
  exercise: {
    name: string;
    slug?: string | null;
    image_path?: string | null;
    image_icon_path?: string | null;
    image_howto_path?: string | null;
  };
  summary: string;
  summaryLabel: string;
  metadata?: ReactNode;
  badgeText?: string;
  metrics?: MetricDatum[];
  density?: "compact" | "detailed";
  tone?: CardSemanticTone;
  expanded: boolean;
  onPress: () => void;
  showLeadingVisual?: boolean;
};

export function HistoryDetailExerciseCard({
  exercise,
  summary,
  summaryLabel,
  metadata,
  badgeText,
  metrics,
  density = "compact",
  tone = "neutral",
  expanded,
  onPress,
  showLeadingVisual = true,
}: HistoryDetailExerciseCardProps) {
  const hasMetrics = density === "detailed" && (metrics?.length ?? 0) > 0;

  return (
    <div
      data-history-card="detail-exercise"
      data-history-density={density}
      data-history-surface="history-detail"
      data-history-expanded={expanded ? "true" : "false"}
    >
      <StandardExerciseRow
        exercise={exercise}
        summary={summary}
        summaryLabel={summaryLabel}
        badgeText={badgeText}
        onPress={onPress}
        className={cn("w-full", appTokens.historyExerciseCardShell)}
        rightIcon={expanded
          ? <ChevronDownIcon className={appTokens.historyChevronIcon} />
          : <ChevronRightIcon className={appTokens.historyChevronIcon} />}
        variant="interactive"
        density={density}
        state={expanded ? "selected" : "default"}
        semanticTone={tone}
        surface="history-detail"
        showLeadingVisual={showLeadingVisual}
        subtitleTone={density === "compact" ? "plain" : "panel"}
        titleClassName="[text-wrap:pretty]"
        subtitleClassName="[text-wrap:pretty]"
      >
        {metadata || hasMetrics ? (
          <div className={cn(density === "compact" ? appTokens.historyExerciseCardCompactStack : appTokens.historyExerciseCardDetailedStack)}>
            {metadata ? (
              <p
                className={cn(
                  EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME,
                  density === "compact" ? appTokens.historyExerciseCompactMetadata : undefined,
                )}
                data-history-card-metadata="true"
              >
                {metadata}
              </p>
            ) : null}
            {hasMetrics ? <MetricGrid items={(metrics ?? []).slice(0, 4)} compact className="sm:grid-cols-3" /> : null}
          </div>
        ) : null}
      </StandardExerciseRow>
    </div>
  );
}
