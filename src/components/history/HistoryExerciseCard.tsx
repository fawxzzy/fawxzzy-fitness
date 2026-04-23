import type { ReactNode } from "react";
import { EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME } from "@/components/ExerciseCard";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { MetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

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

  return (
    <div
      data-history-card="exercise"
      data-history-density={density}
      data-history-surface="history-browser"
    >
      <StandardExerciseRow
        exercise={resolvedExercise}
        summary={summary}
        summaryLabel={summaryLabel}
        badgeText={badgeText}
        onPress={onPress}
        className={appTokens.historyExerciseCardShell}
        variant={density === "compact" ? "interactive" : "standard"}
        density={density}
        semanticTone={tone}
        surface="history-browser"
        showLeadingVisual={density === "compact"}
        subtitleTone={density === "compact" ? "plain" : "panel"}
        titleClassName="[text-wrap:pretty]"
        subtitleClassName="[text-wrap:pretty]"
      >
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
      </StandardExerciseRow>
    </div>
  );
}
