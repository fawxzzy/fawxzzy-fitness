import type { PointerEvent as ReactPointerEvent } from "react";
import { DragHandle } from "@/components/ui/card-system";
import { ExerciseRowCard } from "@/components/workout/ExerciseRowCard";
import { buildExerciseCardMetadataItems } from "@/components/workout/ExerciseCardStandardTitle";
import { normalizeDecoratedText } from "@/lib/text-separator-normalization";
import { resolveWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";

type Props = {
  exerciseId: string;
  exerciseName: string;
  metadata: string;
  measurementType?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  primary_muscle?: string | null;
  equipment?: string | null;
  movement_pattern?: string | null;
  isCardio?: boolean | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
  slug?: string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  orderNumber: number;
  isDragging: boolean;
  onHandlePointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onHandlePointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onHandlePointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onHandlePointerCancel: () => void;
};

/**
 * Reorder presentation of a planned exercise: the same ExerciseRowCard as the day editor, with the drag handle
 * as its trailing control and the card toned `current` while it is being dragged.
 */
export function ReorderExerciseRow({
  exerciseId,
  exerciseName,
  metadata,
  primary_muscle,
  equipment,
  movement_pattern,
  slug,
  image_path,
  image_icon_path,
  image_howto_path,
  isDragging,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onHandlePointerCancel,
}: Props) {
  const policy = resolveWorkoutCardSurfacePolicy("reorder", "compact");
  const targetValues = normalizeDecoratedText(metadata)
    .replace(/^goal\s*:\s*/i, "")
    .split(/\s+[\u2022|\u00B7]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div data-exercise-row-id={exerciseId}>
      <ExerciseRowCard
        exercise={{ name: exerciseName, slug, image_path, image_icon_path, image_howto_path }}
        metaItems={buildExerciseCardMetadataItems({
          primaryMuscle: primary_muscle,
          movementPattern: movement_pattern,
          equipment,
        }).slice(0, 2)}
        targetLabel="Goal"
        targetValues={targetValues}
        showMedia={policy.showMedia}
        tone={isDragging ? "current" : "neutral"}
        interaction={{ kind: "none" }}
        trailing={(
          <DragHandle
            label={`Reorder ${exerciseName}`}
            active={isDragging}
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerCancel}
          />
        )}
      />
    </div>
  );
}
