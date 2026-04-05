import type { PointerEvent as ReactPointerEvent } from "react";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { cn } from "@/lib/cn";

type Props = {
  exerciseId: string;
  exerciseName: string;
  metadata: string;
  iconSrc: string;
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
  iconSrc,
  orderNumber,
  isDragging,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onHandlePointerCancel,
}: Props) {
  return (
    <div data-exercise-row-id={exerciseId}>
      <StandardExerciseRow
        exercise={{ name: exerciseName, image_icon_path: iconSrc }}
        summary={metadata}
        variant="reorder"
        state={isDragging ? "selected" : "default"}
        className={cn("shadow-none", isDragging ? "scale-[0.99] opacity-85" : undefined)}
        trailingStackClassName="grid-rows-[auto_auto_1fr] gap-1.5 py-0"
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
            <span aria-hidden="true" className="text-base leading-none tracking-[-0.08em]">⋮⋮</span>
          </button>
        )}
      >
        <span className="inline-flex w-fit items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-400/14 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100">
          Order {orderNumber}
        </span>
      </StandardExerciseRow>
    </div>
  );
}
