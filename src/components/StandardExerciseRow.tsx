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
  variant?: "compact" | "interactive" | "expanded" | "summary";
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
  variant = "interactive",
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
          className="h-11 w-11 rounded-xl border border-border/35 bg-[rgb(var(--bg)/0.18)] p-0.5"
          imageClassName="rounded-[0.7rem] object-cover object-center scale-[0.97]"
          sizes="44px"
        />
      )}
      badgeText={badgeText}
      onPress={onPress}
      rightIcon={rightIcon}
      className={cn("shadow-none", className)}
      trailingClassName={trailingClassName}
    >
      {children}
    </ExerciseCard>
  );
}
