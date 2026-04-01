import type { PointerEvent as ReactPointerEvent } from "react";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
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
    <div
      className={cn(
        "grid min-h-[4.25rem] grid-cols-[3rem,minmax(0,1fr),2.25rem,2.5rem] items-center gap-2 rounded-[1.1rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.32)] px-2.5 py-2.5 transition-all",
        isDragging ? "scale-[0.99] opacity-80" : undefined,
      )}
      data-exercise-row-id={exerciseId}
    >
      <ExerciseAssetImage
        src={iconSrc}
        alt={`${exerciseName} icon`}
        className="h-11 w-11 rounded-xl border border-border/35"
        imageClassName="object-cover object-center"
        sizes="44px"
      />

      <div className="min-w-0 pr-1">
        <p className="text-[0.92rem] font-semibold leading-tight text-text whitespace-normal break-words">{exerciseName}</p>
        <p className="mt-1 text-xs leading-tight text-muted whitespace-normal break-words">{metadata}</p>
      </div>

      <div className="inline-flex h-7 w-7 items-center justify-center self-start rounded-full border border-emerald-400/35 bg-emerald-400/14 text-[11px] font-semibold tabular-nums text-emerald-100">
        {orderNumber}
      </div>

      <button
        type="button"
        aria-label={`Reorder ${exerciseName}`}
        title="Drag to reorder"
        className="inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-full border border-border/45 bg-[rgb(var(--bg)/0.3)] text-muted hover:bg-[rgb(var(--bg)/0.46)] touch-none"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerCancel}
      >
        ⋮⋮
      </button>
    </div>
  );
}
