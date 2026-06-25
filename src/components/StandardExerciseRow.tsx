import type { CSSProperties, ReactNode } from "react";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { ExerciseCard, type ExerciseCardButtonProps, type ExerciseCardContentVerticalAlign, type ExerciseCardMediaLeftCornerMode, type ExerciseCardRightIconMode, type ExerciseCardTitleMetaMode } from "@/components/ExerciseCard";
import type { CardSemanticTone } from "@/components/cardSemanticTones";
import { cn } from "@/lib/cn";
import {
  getExerciseGoalSummaryState,
  getExerciseGoalSummaryText,
  hasMeaningfulExerciseGoalSummary,
  type ExerciseGoalSummaryValue,
} from "@/lib/exercise-goal-summary";
import type { ProgressionProgressFill } from "@/lib/progression-progress-percent";
import type { ExerciseThumbSourceKind } from "@/lib/exerciseImages";
import { resolveWorkoutCardSurfacePolicy, type WorkoutCardSurface } from "@/lib/workout-card-surface-policy";

type StandardExerciseRowProps = {
  title?: ReactNode;
  exercise: {
    name: string;
    cardSrc?: string | null;
    slug?: string | null;
    image_path?: string | null;
    image_icon_path?: string | null;
    image_howto_path?: string | null;
    thumbnailUrl?: string | null;
    thumbnailSource?: ExerciseThumbSourceKind | null;
  };
  summary?: ExerciseGoalSummaryValue;
  summaryContent?: ReactNode;
  subtitle?: ExerciseGoalSummaryValue;
  onPress?: () => void;
  badgeText?: string;
  rightIcon?: ReactNode;
  overlayActions?: ReactNode;
  overlayActionsClassName?: string;
  actions?: ReactNode;
  className?: string;
  shellClassName?: string;
  shellStyle?: CSSProperties;
  trailingClassName?: string;
  rightRailClassName?: string;
  trailingStackClassName?: string;
  mediaClassName?: string;
  bodyClassName?: string;
  contentClassName?: string;
  titleContainerClassName?: string;
  titleClassName?: string;
  titleMeta?: ReactNode;
  titleMetaMode?: ExerciseCardTitleMetaMode;
  subtitleClassName?: string;
  headerDivider?: ReactNode;
  summaryLabel?: string;
  subtitleTone?: "panel" | "plain";
  variant?: "standard" | "compact" | "list" | "interactive" | "expanded" | "summary" | "reorder";
  state?: "default" | "selected" | "active" | "completed" | "empty";
  density?: "compact" | "detailed";
  semanticTone?: CardSemanticTone;
  children?: ReactNode;
  leadingVisual?: ReactNode;
  showLeadingVisual?: boolean;
  imageSizes?: string;
  mediaRailWidthOverride?: number;
  buttonProps?: ExerciseCardButtonProps;
  surface?: WorkoutCardSurface;
  showAccentRail?: boolean;
  mediaLeftCornerMode?: ExerciseCardMediaLeftCornerMode;
  hideEmptySummary?: boolean;
  rightIconMode?: ExerciseCardRightIconMode;
  contentVerticalAlign?: ExerciseCardContentVerticalAlign;
  progressFill?: ProgressionProgressFill | null;
};

export function StandardExerciseRow({
  title,
  exercise,
  summary,
  summaryContent,
  subtitle,
  onPress,
  badgeText,
  rightIcon,
  overlayActions,
  overlayActionsClassName,
  actions,
  className,
  shellClassName,
  shellStyle,
  trailingClassName,
  rightRailClassName,
  trailingStackClassName,
  mediaClassName,
  bodyClassName,
  contentClassName,
  titleContainerClassName,
  titleClassName,
  titleMeta,
  titleMetaMode,
  subtitleClassName,
  headerDivider,
  summaryLabel,
  subtitleTone,
  variant = "standard",
  state,
  density,
  semanticTone,
  children,
  leadingVisual,
  showLeadingVisual = true,
  imageSizes,
  mediaRailWidthOverride,
  buttonProps,
  surface = "exercise-picker",
  showAccentRail = true,
  mediaLeftCornerMode,
  hideEmptySummary = false,
  rightIconMode,
  contentVerticalAlign,
  progressFill,
}: StandardExerciseRowProps) {
  const resolvedSummary = summary ?? subtitle;
  const hasMeaningfulSummary = hasMeaningfulExerciseGoalSummary(resolvedSummary);
  const resolvedSubtitle = summaryContent ?? (
    hideEmptySummary && !hasMeaningfulSummary
      ? undefined
      : getExerciseGoalSummaryText(resolvedSummary)
  );
  const resolvedState = state ?? (hideEmptySummary && !hasMeaningfulSummary ? "default" : getExerciseGoalSummaryState(resolvedSummary));
  const resolvedDensity = density ?? (variant === "standard" || variant === "expanded" || variant === "summary" ? "detailed" : "compact");
  const usesCompactDensity = resolvedDensity === "compact";
  const surfacePolicy = resolveWorkoutCardSurfacePolicy(surface, resolvedDensity);
  const mediaRailWidth = mediaRailWidthOverride ?? surfacePolicy.mediaRailWidth;
  const allowsSurfaceMedia = surfacePolicy.showMedia && mediaRailWidth > 0;
  const resolvedImageSizes = imageSizes ?? `${Math.max(mediaRailWidth, 1)}px`;
  const resolvedLeadingVisual = allowsSurfaceMedia
    ? (
        leadingVisual ?? (showLeadingVisual ? (
          <ExerciseThumb
            exercise={exercise}
            detailed={!usesCompactDensity}
            layout="rail"
            railWidth={mediaRailWidth}
            sizes={resolvedImageSizes}
            intent="row-card"
          />
        ) : undefined)
      )
    : undefined;

  return (
    <ExerciseCard
      title={title ?? exercise.name}
      titleMeta={titleMeta}
      titleMetaMode={titleMetaMode}
      subtitle={resolvedSubtitle}
      variant={variant}
      state={resolvedState}
      density={resolvedDensity}
      semanticTone={semanticTone}
      leadingVisual={resolvedLeadingVisual}
      mediaLayout="rail"
      mediaRailWidth={resolvedLeadingVisual ? mediaRailWidth : undefined}
      mediaLeftCornerMode={mediaLeftCornerMode}
      badgeText={badgeText}
      onPress={onPress}
      rightIcon={rightIcon}
      overlayActions={overlayActions}
      overlayActionsClassName={overlayActionsClassName}
      rightIconMode={rightIconMode}
      actions={actions}
      className={cn("shadow-none", shellClassName, className)}
      shellStyle={shellStyle}
      trailingClassName={trailingClassName}
      rightRailClassName={rightRailClassName}
      trailingStackClassName={trailingStackClassName}
      mediaClassName={mediaClassName}
      bodyClassName={bodyClassName}
      contentClassName={contentClassName}
      titleContainerClassName={titleContainerClassName}
      titleClassName={titleClassName}
      subtitleClassName={subtitleClassName}
      headerDivider={headerDivider}
      subtitleLabel={summaryLabel}
      subtitleTone={subtitleTone}
      showAccentRail={showAccentRail}
      buttonProps={buttonProps}
      contentVerticalAlign={contentVerticalAlign}
      progressFill={progressFill}
    >
      {children}
    </ExerciseCard>
  );
}
