import type { ReactNode } from "react";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { ExerciseCard, type ExerciseCardButtonProps } from "@/components/ExerciseCard";
import type { CardSemanticTone } from "@/components/cardSemanticTones";
import { cn } from "@/lib/cn";
import { getExerciseGoalSummaryState, getExerciseGoalSummaryText, type ExerciseGoalSummaryValue } from "@/lib/exercise-goal-summary";
import type { ExerciseThumbSourceKind } from "@/lib/exerciseImages";
import { resolveWorkoutCardMediaRailWidth, resolveWorkoutCardSurfacePolicy, type WorkoutCardSurface } from "@/lib/workout-card-surface-policy";

type StandardExerciseRowProps = {
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
  subtitle?: ExerciseGoalSummaryValue;
  onPress?: () => void;
  badgeText?: string;
  rightIcon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  trailingClassName?: string;
  rightRailClassName?: string;
  trailingStackClassName?: string;
  mediaClassName?: string;
  bodyClassName?: string;
  contentClassName?: string;
  titleContainerClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  summaryLabel?: string;
  variant?: "standard" | "compact" | "list" | "interactive" | "expanded" | "summary" | "reorder";
  state?: "default" | "selected" | "active" | "completed" | "empty";
  density?: "compact" | "detailed";
  semanticTone?: CardSemanticTone;
  children?: ReactNode;
  leadingVisual?: ReactNode;
  showLeadingVisual?: boolean;
  imageSizes?: string;
  buttonProps?: ExerciseCardButtonProps;
  surface?: WorkoutCardSurface;
};

export function StandardExerciseRow({
  exercise,
  summary,
  subtitle,
  onPress,
  badgeText,
  rightIcon,
  actions,
  className,
  trailingClassName,
  rightRailClassName,
  trailingStackClassName,
  mediaClassName,
  bodyClassName,
  contentClassName,
  titleContainerClassName,
  titleClassName,
  subtitleClassName,
  summaryLabel,
  variant = "standard",
  state,
  density,
  semanticTone,
  children,
  leadingVisual,
  showLeadingVisual = true,
  imageSizes,
  buttonProps,
  surface = "exercise-picker",
}: StandardExerciseRowProps) {
  const resolvedSummary = summary ?? subtitle;
  const resolvedState = state ?? getExerciseGoalSummaryState(resolvedSummary);
  const resolvedDensity = density ?? (variant === "standard" || variant === "expanded" || variant === "summary" ? "detailed" : "compact");
  const usesCompactDensity = resolvedDensity === "compact";
  const surfacePolicy = resolveWorkoutCardSurfacePolicy(surface, resolvedDensity);
  const mediaRailWidth = resolveWorkoutCardMediaRailWidth(surface);
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
      title={exercise.name}
      subtitle={getExerciseGoalSummaryText(resolvedSummary)}
      variant={variant}
      state={resolvedState}
      density={resolvedDensity}
      semanticTone={semanticTone}
      leadingVisual={resolvedLeadingVisual}
      mediaLayout="rail"
      mediaRailWidth={resolvedLeadingVisual ? mediaRailWidth : undefined}
      badgeText={badgeText}
      onPress={onPress}
      rightIcon={rightIcon}
      actions={actions}
      className={cn("shadow-none", className)}
      trailingClassName={trailingClassName}
      rightRailClassName={rightRailClassName}
      trailingStackClassName={trailingStackClassName}
      mediaClassName={mediaClassName}
      bodyClassName={bodyClassName}
      contentClassName={contentClassName}
      titleContainerClassName={titleContainerClassName}
      titleClassName={titleClassName}
      subtitleClassName={subtitleClassName}
      subtitleLabel={summaryLabel}
      buttonProps={buttonProps}
    >
      {children}
    </ExerciseCard>
  );
}
