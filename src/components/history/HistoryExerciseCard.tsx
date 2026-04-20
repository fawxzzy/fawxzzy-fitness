import type { ReactNode } from "react";
import { EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME } from "@/components/ExerciseCard";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { MetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";

export function HistoryExerciseCard({
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

  return (
    <StandardExerciseRow
      exercise={{ name: title }}
      summary={summary}
      summaryLabel={summaryLabel}
      badgeText={badgeText}
      onPress={onPress}
      className="shadow-none"
      variant={density === "compact" ? "interactive" : "standard"}
      density={density}
      semanticTone={tone}
      surface="history-browser"
      showLeadingVisual={false}
      titleClassName="[text-wrap:pretty]"
      subtitleClassName="[text-wrap:pretty]"
    >
      <div className={cn(density === "compact" ? "space-y-2" : "space-y-2.5")}>
        {metadata ? (
          <p className={EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME}>
            {metadata}
          </p>
        ) : null}
        {hasMetrics ? <MetricGrid items={(metrics ?? []).slice(0, 4)} compact className="sm:grid-cols-3" /> : null}
      </div>
    </StandardExerciseRow>
  );
}
