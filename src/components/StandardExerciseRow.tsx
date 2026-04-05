import type { ReactNode } from "react";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseCard } from "@/components/ExerciseCard";
import { getExerciseIconSrc } from "@/lib/exerciseImages";
import { cn } from "@/lib/cn";
import { getExerciseGoalSummaryState, getExerciseGoalSummaryText, type ExerciseGoalSummaryValue } from "@/lib/exercise-goal-summary";

type StandardExerciseRowProps = {
  exercise: {
    name: string;
    slug?: string | null;
    image_path?: string | null;
    image_icon_path?: string | null;
    image_howto_path?: string | null;
  };
  summary?: ExerciseGoalSummaryValue;
  onPress?: () => void;
  badgeText?: string;
  rightIcon?: ReactNode;
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
  variant?: "standard" | "compact" | "list" | "interactive" | "expanded" | "summary" | "reorder";
  state?: "default" | "selected" | "active" | "completed" | "empty";
  children?: ReactNode;
};

export function StandardExerciseRow({
  exercise,
  summary,
  onPress,
  badgeText,
  rightIcon,
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
  variant = "standard",
  state,
  children,
}: StandardExerciseRowProps) {
  const resolvedState = state ?? getExerciseGoalSummaryState(summary);

  return (
    <ExerciseCard
      title={exercise.name}
      subtitle={getExerciseGoalSummaryText(summary)}
      variant={variant}
      state={resolvedState}
      leadingVisual={(
        <ExerciseAssetImage
          src={getExerciseIconSrc(exercise)}
          alt={`${exercise.name} icon`}
          className="h-full w-full"
          imageClassName="object-cover object-center"
          sizes="44px"
        />
      )}
      badgeText={badgeText}
      onPress={onPress}
      rightIcon={rightIcon}
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
    >
      {children}
    </ExerciseCard>
  );
}
