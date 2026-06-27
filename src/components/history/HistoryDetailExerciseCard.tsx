import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME } from "@/components/ExerciseCard";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { SignatureDot, SignatureMetaTag } from "@/components/ui/app/SignatureSeparator";
import { StateChevron } from "@/components/ui/StateChevron";
import { MetricAccentBar, SurfaceMetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { appTokens } from "@/components/ui/app/tokens";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { ExerciseCardStandardTitle } from "@/components/workout/ExerciseCardStandardTitle";
import { cn } from "@/lib/cn";
import type { WorkoutCardSurface } from "@/lib/workout-card-surface-policy";

function renderMetaBadge(value: string) {
  return (
    <SignatureMetaTag className="text-[9px] tracking-[0.14em]">
      {value}
    </SignatureMetaTag>
  );
}

function renderDetailedBulletSection({
  title,
  items,
  leadingVisual,
  detailCutoutSize,
}: {
  title: string;
  items: string[];
  leadingVisual?: ReactNode;
  detailCutoutSize?: number;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-1.5 pt-[0.45rem] bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_0]">
      <div className="w-full space-y-1">
        {leadingVisual ? (
          <div
            className="float-left mb-1.5 mr-3 overflow-hidden"
            style={{ width: `${detailCutoutSize ?? 104}px`, height: `${detailCutoutSize ?? 104}px` }}
          >
            {leadingVisual}
          </div>
        ) : null}
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
        {leadingVisual ? <div className="clear-left" /> : null}
      </div>
    </div>
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
  headerMetadata?: ReactNode;
  metadata?: ReactNode;
  badgeText?: string;
  badgeItems?: string[];
  metrics?: MetricDatum[];
  density?: "compact" | "detailed";
  tone?: CardSemanticTone;
  className?: string;
  mediaClassName?: string;
  shellStyle?: CSSProperties;
  leadingVisual?: ReactNode;
  detailVisualAside?: ReactNode;
  mediaRailWidthOverride?: number;
  footerContent?: ReactNode;
  detailSections?: Array<{
    title: string;
    items: string[];
  }>;
  surface?: WorkoutCardSurface;
  dataSurface?: string;
  compactBadgePlacement?: "trailing" | "stack";
  combineCompactSummaryLabel?: boolean;
  expanded: boolean;
  onPress?: () => void;
  showLeadingVisual?: boolean;
};

export function HistoryDetailExerciseCard({
  exercise,
  summary,
  summaryLabel,
  headerMetadata,
  metadata,
  badgeText,
  badgeItems = [],
  metrics,
  density = "compact",
  tone = "neutral",
  className,
  mediaClassName,
  shellStyle,
  leadingVisual,
  detailVisualAside,
  mediaRailWidthOverride,
  footerContent,
  detailSections = [],
  surface = "history-detail",
  dataSurface = "history-detail",
  compactBadgePlacement = "trailing",
  expanded,
  onPress,
  showLeadingVisual = true,
}: HistoryDetailExerciseCardProps) {
  const isInteractive = typeof onPress === "function";
  const hasMetrics = density === "detailed" && (metrics?.length ?? 0) > 0;
  const shouldRenderTopAccentBar = density === "detailed" ? hasMetrics : expanded;
  const rotatingBadgeItems = useMemo(
    () => (badgeItems.length > 0 ? badgeItems : (badgeText ? [badgeText] : [])),
    [badgeItems, badgeText],
  );
  const [badgeIndex, setBadgeIndex] = useState(0);

  useEffect(() => {
    if (rotatingBadgeItems.length <= 1) {
      setBadgeIndex(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setBadgeIndex((current) => (current + 1) % rotatingBadgeItems.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [rotatingBadgeItems]);

  const activeBadge = rotatingBadgeItems[badgeIndex] ?? rotatingBadgeItems[0] ?? null;
  const resolvedMetaBadge = density === "compact" ? null : (activeBadge ? renderMetaBadge(activeBadge) : null);
  const compactTrailingMeta = density === "compact" && compactBadgePlacement === "trailing" && activeBadge
    ? <SignatureMetaTag className="text-[10.5px] tracking-[0.14em]">{activeBadge}</SignatureMetaTag>
    : null;
  const topAccentBar = shouldRenderTopAccentBar ? <MetricAccentBar variant="thin" /> : null;
  const bodyMetadata = headerMetadata ? null : metadata;
  const titleNode = (
    <ExerciseCardStandardTitle
      name={exercise.name}
      metadata={headerMetadata}
      rightTitle={summaryLabel}
      rightContent={summary.trim().length > 0 ? summary : undefined}
      columnLayout="compact"
      rightColumnClassName={density === "compact" ? "max-w-[12.2rem]" : "max-w-[14rem]"}
    />
  );
  const hasSupportingStack = Boolean(bodyMetadata) || hasMetrics || detailSections.length > 0 || Boolean(footerContent);
  const shouldUseDetailedCutoutVisual = density === "detailed" && Boolean(leadingVisual);
  const detailCutoutSize = mediaRailWidthOverride ?? 104;
  const resolvedRightIcon = !isInteractive
    ? compactTrailingMeta
    : density === "compact" && compactTrailingMeta
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
      data-history-surface={dataSurface}
      data-history-expanded={expanded ? "true" : "false"}
    >
      <StandardExerciseRow
        title={titleNode}
        exercise={exercise}
        summaryContent={undefined}
        summaryLabel={undefined}
        titleMeta={resolvedMetaBadge}
        onPress={onPress}
        className={cn("w-full", appTokens.historyExerciseCardShell, className)}
        shellStyle={shellStyle}
        rightIcon={resolvedRightIcon}
        variant={isInteractive ? "interactive" : "compact"}
        density={density}
        state={expanded ? "selected" : "default"}
        semanticTone={tone}
        surface={surface}
        showLeadingVisual={shouldUseDetailedCutoutVisual ? false : showLeadingVisual}
        subtitleTone="plain"
        hideEmptySummary
        rightIconMode="overlay"
        titleContainerClassName={density === "compact" ? "pr-[5.3rem]" : "pr-[2.35rem] space-y-0.5"}
        rightRailClassName={density === "compact" ? "right-[0.78rem] bottom-[0.58rem] top-auto translate-y-0" : "right-[0.85rem] top-1/2 -translate-y-1/2"}
        trailingStackClassName={density === "compact" ? "items-end justify-end" : "h-4.5 w-4.5"}
        leadingVisual={shouldUseDetailedCutoutVisual ? undefined : leadingVisual}
        mediaClassName={mediaClassName}
        mediaRailWidthOverride={mediaRailWidthOverride}
        contentClassName="pl-1.5"
        titleClassName="max-[420px]:line-clamp-3 [text-wrap:pretty]"
        subtitleClassName="[text-wrap:pretty] text-[rgb(var(--text-secondary)/0.9)]"
        headerDivider={topAccentBar}
        shellClassName="[--glass-shadow:none] before:!bg-transparent after:!shadow-none"
      >
        {hasSupportingStack ? (
          <div className={cn(density === "compact" ? appTokens.historyExerciseCardCompactStack : appTokens.historyExerciseCardDetailedStack, density === "detailed" ? "space-y-2.5 pt-1" : undefined)}>
            {bodyMetadata ? (
              <div
                className={cn(
                  EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME,
                  density === "compact" ? appTokens.historyExerciseCompactMetadata : undefined,
                )}
                data-history-card-metadata="true"
              >
                {bodyMetadata}
              </div>
            ) : null}
            {hasMetrics ? (
              <SurfaceMetricGrid
                items={metrics ?? []}
                autoColumns
                itemClassName="px-2.5 py-1"
                fullWidthUnderline
                scrollable
              />
            ) : null}
            {detailSections.length > 0 ? (
              <div className="space-y-1 pt-0.5">
                {detailSections.map((section, index) => (
                  <div key={section.title}>
                    {renderDetailedBulletSection({
                      ...section,
                      leadingVisual: shouldUseDetailedCutoutVisual && index === detailSections.length - 1 ? leadingVisual : undefined,
                      detailCutoutSize,
                    })}
                  </div>
                ))}
              </div>
            ) : null}
            {shouldUseDetailedCutoutVisual && detailSections.length === 0 ? (
              <div className="pt-0.5">
                <div className="flex min-w-0 items-stretch gap-3">
                  <div
                    className="shrink-0 overflow-hidden"
                    style={{ width: `${detailCutoutSize}px`, height: `${detailCutoutSize}px` }}
                  >
                    {leadingVisual}
                  </div>
                  {detailVisualAside ? (
                    <div className="min-w-0 flex-1 self-stretch">
                      {detailVisualAside}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            {footerContent}
          </div>
        ) : null}
      </StandardExerciseRow>
    </div>
  );
}
