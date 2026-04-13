import type { PointerEvent as ReactPointerEvent } from "react";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { cn } from "@/lib/cn";
import { resolveWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";

type Props = {
  exerciseId: string;
  exerciseName: string;
  metadata: string;
  measurementType?: "reps" | "time" | "distance" | "time_distance" | null;
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

export function ReorderExerciseRow({
  exerciseId,
  exerciseName,
  metadata,
  measurementType,
  primary_muscle,
  equipment,
  movement_pattern,
  isCardio,
  kind,
  type,
  tags,
  categories,
  slug,
  image_path,
  image_icon_path,
  image_howto_path,
  orderNumber,
  isDragging,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onHandlePointerCancel,
}: Props) {
  const policy = resolveWorkoutCardSurfacePolicy("reorder", "compact");

  return (
    <div data-exercise-row-id={exerciseId}>
      <StandardExerciseRow
        exercise={{ name: exerciseName, slug, image_path, image_icon_path, image_howto_path }}
        summary={metadata}
        summaryLabel="Goal"
        variant="reorder"
        state={isDragging ? "selected" : "default"}
        badgeText={`ORDER ${orderNumber}`}
        className={cn("shadow-none", isDragging ? "scale-[0.99] opacity-85" : undefined)}
        trailingStackClassName="gap-2"
        showLeadingVisual={policy.showMedia}
        rightIcon={(
          <button
            type="button"
            aria-label={`Reorder ${exerciseName}`}
            title="Drag to reorder"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/45 bg-[rgb(var(--bg)/0.3)] text-muted hover:bg-[rgb(var(--bg)/0.46)] touch-none"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerCancel}
          >
            <span aria-hidden="true" className="text-base leading-none tracking-[-0.08em]">::</span>
          </button>
        )}
      />
    </div>
  );
}
