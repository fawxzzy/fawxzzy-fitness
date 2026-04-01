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
        "grid min-h-[4.5rem] grid-cols-[3rem,minmax(0,1fr),2rem,2.75rem] items-stretch gap-2 rounded-[1.1rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.32)] px-2.5 py-2.5 transition-all",
        isDragging ? "scale-[0.99] border-emerald-300/35 opacity-80" : undefined,
      )}
      data-exercise-row-id={exerciseId}
    >
      <div className="flex h-full items-center justify-center">
        <ExerciseAssetImage
          src={iconSrc}
          alt={`${exerciseName} icon`}
          className="h-11 w-11 rounded-xl border border-border/35"
          imageClassName="object-cover object-center"
          sizes="44px"
        />
      </div>

      <div className="min-w-0 self-center pr-0.5">
        <p className="text-[0.92rem] font-semibold leading-tight text-text [overflow-wrap:anywhere] break-normal hyphens-none">{exerciseName}</p>
        <p className="mt-1 text-xs leading-tight text-muted [overflow-wrap:anywhere] break-normal hyphens-none">{metadata}</p>
      </div>

      <div className="flex h-full items-start justify-center pt-0.5">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-400/14 px-1.5 text-[11px] font-semibold tabular-nums text-emerald-100">
          {orderNumber}
        </span>
      </div>

      <div className="flex h-full items-center justify-end">
        <button
          type="button"
          aria-label={`Reorder ${exerciseName}`}
          title="Drag to reorder"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/45 bg-[rgb(var(--bg)/0.3)] text-muted hover:bg-[rgb(var(--bg)/0.46)] touch-none"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerCancel}
        >
          <span aria-hidden="true" className="text-base leading-none tracking-[-0.08em]">⋮⋮</span>
        </button>
      </div>
    </div>
  );
}
