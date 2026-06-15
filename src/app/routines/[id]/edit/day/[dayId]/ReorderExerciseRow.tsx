import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { resolveWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";

const reorderHandleSelectionChromeStyle = {
  borderColor: "rgb(var(--selection-rgb) / 0.3)",
  color: "rgb(var(--text-primary) / 0.96)",
  background: "linear-gradient(180deg, rgb(var(--selection-rgb) / 0.05), rgb(var(--surface-1-rgb) / 0.3))",
  boxShadow: "inset 0 0 0 1px rgb(var(--selection-rgb) / 0.16), 0 0 0 1px rgb(var(--selection-rgb) / 0.05), 0 0 16px rgb(var(--selection-rgb) / 0.12), 0 12px 24px rgba(0, 0, 0, 0.16)",
} as CSSProperties;

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
        subtitleTone="plain"
        variant="reorder"
        state={isDragging ? "selected" : "default"}
        badgeText={undefined}
        bodyClassName={appTokens.routineEditorReorderBody}
        className={cn(appTokens.routineEditorReorderBase, isDragging ? appTokens.routineEditorReorderDragging : undefined)}
        trailingStackClassName={appTokens.routineEditorReorderTrailingStack}
        showLeadingVisual={policy.showMedia}
        rightIcon={(
          <button
            type="button"
            aria-label={`Reorder ${exerciseName}`}
            title="Drag to reorder"
            className={cn(
              appTokens.routineEditorReorderHandle,
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--selection-rgb)/0.22)]",
            )}
            style={reorderHandleSelectionChromeStyle}
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerCancel}
          >
            <span aria-hidden="true" className={appTokens.routineEditorHandleGlyph}>
              <span className="block h-[1.5px] w-[10px] rounded-full bg-current" />
              <span className="block h-[1.5px] w-[10px] rounded-full bg-current" />
            </span>
          </button>
        )}
      />
    </div>
  );
}
