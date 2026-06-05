import type { CSSProperties, ReactNode } from "react";
import { EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME } from "@/components/ExerciseCard";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { SignatureMetaTag } from "@/components/ui/app/SignatureSeparator";
import { StateChevron } from "@/components/ui/StateChevron";
import { MetricAccentBar, SurfaceMetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { appTokens } from "@/components/ui/app/tokens";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { cn } from "@/lib/cn";

function renderMetaBadge(value: string) {
  return (
    <SignatureMetaTag className="text-[9px] tracking-[0.14em]">
      {value}
    </SignatureMetaTag>
  );
}

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
  className?: string;
  mediaClassName?: string;
  shellStyle?: CSSProperties;
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
  className,
  mediaClassName,
  shellStyle,
  expanded,
  onPress,
  showLeadingVisual = true,
}: HistoryDetailExerciseCardProps) {
  const hasMetrics = density === "detailed" && (metrics?.length ?? 0) > 0;
  const shouldRenderTopAccentBar = density === "detailed" ? hasMetrics : expanded;
  const resolvedMetaBadge = density === "compact" ? null : (badgeText ? renderMetaBadge(badgeText) : null);
  const compactTrailingMeta = density === "compact" && badgeText
    ? <SignatureMetaTag className="text-[10.5px] tracking-[0.14em]">{badgeText}</SignatureMetaTag>
    : null;
  const resolvedSummary = density === "compact" && summaryLabel.trim().length > 0
    ? `${summaryLabel} | ${summary}`
    : summary;
  const topAccentBar = shouldRenderTopAccentBar ? <MetricAccentBar variant="thin" /> : null;
  const hasSupportingStack = Boolean(metadata) || hasMetrics;
  const resolvedRightIcon = density === "compact" && compactTrailingMeta
    ? (
        <div className="flex items-center justify-end gap-2">
          {compactTrailingMeta}
          <StateChevron expanded={expanded} className={appTokens.historyChevronIcon} />
        </div>
      )
    : <StateChevron expanded={expanded} className={appTokens.historyChevronIcon} />;

  return (
    <div
      data-history-card="detail-exercise"
      data-history-density={density}
      data-history-surface="history-detail"
      data-history-expanded={expanded ? "true" : "false"}
    >
      <StandardExerciseRow
        exercise={exercise}
        summary={resolvedSummary}
        summaryLabel={density === "compact" ? undefined : summaryLabel}
        titleMeta={resolvedMetaBadge}
        onPress={onPress}
        className={cn("w-full", appTokens.historyExerciseCardShell, className)}
        shellStyle={shellStyle}
        rightIcon={resolvedRightIcon}
        variant="interactive"
        density={density}
        state={expanded ? "selected" : "default"}
        semanticTone={tone}
        surface="history-detail"
        showLeadingVisual={showLeadingVisual}
        subtitleTone={density === "compact" ? "plain" : "panel"}
        rightIconMode="overlay"
        titleContainerClassName={density === "compact" ? "pr-[5.3rem]" : "pr-[2.35rem] space-y-0.5"}
        rightRailClassName={density === "compact" ? "right-[0.78rem] bottom-[0.58rem] top-auto translate-y-0" : "right-[0.85rem] top-1/2 -translate-y-1/2"}
        trailingStackClassName={density === "compact" ? "items-end justify-end" : "h-4.5 w-4.5"}
        mediaClassName={mediaClassName}
        contentClassName="pl-1.5"
        titleClassName="max-[380px]:line-clamp-3 [text-wrap:pretty]"
        subtitleClassName="[text-wrap:pretty] text-[rgb(var(--text-secondary)/0.9)]"
        headerDivider={topAccentBar}
        shellClassName="[--glass-shadow:none] before:!bg-transparent after:!shadow-none"
      >
        {hasSupportingStack ? (
          <div className={cn(density === "compact" ? appTokens.historyExerciseCardCompactStack : appTokens.historyExerciseCardDetailedStack, density === "detailed" ? "space-y-2.5 pt-1" : undefined)}>
            {metadata ? (
              <div
                className={cn(
                  EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME,
                  density === "compact" ? appTokens.historyExerciseCompactMetadata : undefined,
                )}
                data-history-card-metadata="true"
              >
                {metadata}
              </div>
            ) : null}
            {hasMetrics ? (
              <>
                <SurfaceMetricGrid
                  items={(metrics ?? []).slice(0, 4)}
                  autoColumns={false}
                  className="sm:grid-cols-3"
                  itemClassName="px-2.5 py-1"
                />
              </>
            ) : null}
          </div>
        ) : null}
      </StandardExerciseRow>
    </div>
  );
}
