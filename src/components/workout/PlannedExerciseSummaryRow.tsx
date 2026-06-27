"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ExerciseCardRightIconMode, ExerciseCardTitleMetaMode } from "@/components/ExerciseCard";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import type { CardSemanticTone } from "@/components/cardSemanticTones";
import {
  buildExerciseCardMetadataItems,
  ExerciseCardMetadataLine,
  ExerciseCardProgressionStateInline,
  ExerciseCardStandardTitle,
} from "@/components/workout/ExerciseCardStandardTitle";
import { WorkoutExerciseCardDetails } from "@/components/workout/WorkoutExerciseCardDetails";
import type { ProgressionProgressFill } from "@/lib/progression-progress-percent";
import { isStretchHubExercise } from "@/lib/stretch-library";
import { buildPlannedExerciseDetailMetrics, type WorkoutCardDensity } from "@/lib/workout-card-view-models";
import { applyWorkoutCardSurfacePolicy, resolveWorkoutCardSurfacePolicy, type WorkoutCardSurface } from "@/lib/workout-card-surface-policy";

type PlannedExerciseSummaryRowExercise = {
  id: string;
  exerciseId?: string;
  name: string;
  targets: string | null;
  primary_muscle?: string | null;
  equipment?: string | null;
  movement_pattern?: string | null;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  isCardio?: boolean | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  slug?: string | null;
  loggedSetCount?: number;
  isSkipped?: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  progressionStateLabel?: string | null;
};

export function PlannedExerciseSummaryRow({
  exercise,
  density = "compact",
  surface,
  rowClassName,
  rowContentClassName = "pl-3",
  rightIcon,
  onPress,
  state = "default",
  semanticTone,
  badgeText,
  shellClassName,
  shellStyle,
  rightIconMode,
  rightRailClassName,
  titleContainerClassName,
  trailingStackClassName,
  titleMeta,
  titleMetaClassName,
  cornerMeta,
  cornerMetaClassName,
  titleMetaMode,
  progressFill,
  overlayActions,
  overlayActionsClassName,
}: {
  exercise: PlannedExerciseSummaryRowExercise;
  density?: WorkoutCardDensity;
  surface: WorkoutCardSurface;
  rowClassName?: string;
  rowContentClassName?: string;
  rightIcon?: ReactNode;
  onPress?: () => void;
  state?: "default" | "selected" | "active" | "completed" | "empty";
  semanticTone?: CardSemanticTone;
  badgeText?: string;
  shellClassName?: string;
  shellStyle?: CSSProperties;
  rightIconMode?: ExerciseCardRightIconMode;
  rightRailClassName?: string;
  titleContainerClassName?: string;
  trailingStackClassName?: string;
  titleMeta?: ReactNode;
  titleMetaClassName?: string;
  cornerMeta?: ReactNode;
  cornerMetaClassName?: string;
  titleMetaMode?: ExerciseCardTitleMetaMode;
  progressFill?: ProgressionProgressFill | null;
  overlayActions?: ReactNode;
  overlayActionsClassName?: string;
}) {
  const isStretchHub = isStretchHubExercise(exercise);
  const resolvedSummary = isStretchHub ? null : exercise.targets;
  const headerMetaItems = buildExerciseCardMetadataItems({
    primaryMuscle: exercise.primary_muscle,
    movementPattern: exercise.movement_pattern,
    equipment: exercise.equipment,
  });
  const visibleHeaderMetaItems = surface === "today" ? headerMetaItems.slice(0, 2) : headerMetaItems;
  const detailedMetrics = buildPlannedExerciseDetailMetrics({
    name: exercise.name,
    slug: exercise.slug,
    measurementType: exercise.measurement_type,
    isCardio: exercise.isCardio,
    kind: exercise.kind,
    type: exercise.type,
    equipment: exercise.equipment,
    movementPattern: exercise.movement_pattern,
    primaryMuscle: exercise.primary_muscle,
    tags: exercise.tags,
    categories: exercise.categories,
    loggedSetCount: exercise.loggedSetCount ?? 0,
    isSkipped: exercise.isSkipped === true,
    targetSetsMin: exercise.targetSetsMin,
    targetSetsMax: exercise.targetSetsMax,
  });
  const { policy, chips, detailedMetrics: visibleDetailedMetrics } = applyWorkoutCardSurfacePolicy({
    surface,
    density,
    detailedMetrics,
  });
  const surfacePolicy = resolveWorkoutCardSurfacePolicy(surface, density);

  return (
    <StandardExerciseRow
      title={(
        <ExerciseCardStandardTitle
          name={exercise.name}
          metadata={<ExerciseCardMetadataLine items={visibleHeaderMetaItems} />}
          rightContent={resolvedSummary ?? undefined}
          rightSubcontent={!isStretchHub && exercise.progressionStateLabel?.trim()
            ? <ExerciseCardProgressionStateInline label={exercise.progressionStateLabel} />
            : undefined}
          columnLayout="compact"
        />
      )}
      exercise={exercise}
      summary={undefined}
      subtitleTone="plain"
      variant="interactive"
      density={density}
      contentClassName={rowContentClassName}
      state={state}
      semanticTone={semanticTone}
      badgeText={badgeText}
      className={rowClassName}
      rightIcon={rightIcon}
      onPress={onPress}
      surface={surface}
      showLeadingVisual={policy.showMedia}
      showAccentRail
      hideEmptySummary
      shellClassName={shellClassName}
      shellStyle={shellStyle}
      rightIconMode={rightIconMode}
      rightRailClassName={rightRailClassName}
      titleContainerClassName={titleContainerClassName}
      titleMeta={titleMeta}
      titleMetaClassName={titleMetaClassName}
      cornerMeta={cornerMeta}
      cornerMetaClassName={cornerMetaClassName}
      titleMetaMode={titleMetaMode ?? (titleMeta ? "overlay-tight" : undefined)}
      trailingStackClassName={trailingStackClassName}
      overlayActions={overlayActions}
      overlayActionsClassName={overlayActionsClassName}
      mediaRailWidthOverride={surfacePolicy.mediaRailWidth}
      contentVerticalAlign={isStretchHub ? "top" : "auto"}
      progressFill={progressFill}
    >
      <WorkoutExerciseCardDetails
        density={density}
        chips={chips}
        detailedMetrics={visibleDetailedMetrics}
      />
    </StandardExerciseRow>
  );
}
