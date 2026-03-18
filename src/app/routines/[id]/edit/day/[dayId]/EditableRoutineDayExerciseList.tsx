"use client";

import { useMemo, useRef, useState } from "react";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppButton } from "@/components/ui/AppButton";
import { controlClassName } from "@/components/ui/formClasses";
import { cn } from "@/lib/cn";

type EditableRoutineDayExerciseItem = {
  id: string;
  exerciseId: string;
  name: string;
  targetSummary: string;
  isCardio: boolean;
  defaultDistanceUnit: "mi" | "km" | "m";
  defaults: {
    targetSets?: number | null;
    targetReps?: number | null;
    targetRepsMin?: number | null;
    targetRepsMax?: number | null;
    targetWeight?: number | null;
    targetWeightUnit?: "lbs" | "kg" | null;
    targetDurationSeconds?: number | null;
    targetDistance?: number | null;
    targetDistanceUnit?: "mi" | "km" | "m" | null;
    targetCalories?: number | null;
  };
};

type Props = {
  routineId: string;
  routineDayId: string;
  weightUnit: "lbs" | "kg";
  exercises: EditableRoutineDayExerciseItem[];
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  reorderAction: (formData: FormData) => void | Promise<void>;
};

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return "";
  if (seconds < 60) return String(seconds);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function RoutineTargetInputs({
  weightUnit,
  distanceUnit,
  defaults,
}: {
  weightUnit: "lbs" | "kg";
  distanceUnit: "mi" | "km" | "m";
  defaults: EditableRoutineDayExerciseItem["defaults"];
}) {
  const hasReps = defaults.targetRepsMin != null || defaults.targetRepsMax != null || defaults.targetReps != null;
  const hasWeight = defaults.targetWeight != null;
  const hasTime = defaults.targetDurationSeconds != null;
  const hasDistance = defaults.targetDistance != null;
  const hasCalories = defaults.targetCalories != null;

  return (
    <div className="space-y-2">
      <details className="rounded-md border border-border/70 bg-[rgb(var(--bg)/0.35)] px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span>Add Measurement</span>
          <span aria-hidden="true" className="details-chevron text-xs text-muted">⌄</span>
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="measurementSelections" value="reps" defaultChecked={hasReps} />Reps</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="measurementSelections" value="weight" defaultChecked={hasWeight} />Weight</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="measurementSelections" value="time" defaultChecked={hasTime} />Time (duration)</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="measurementSelections" value="distance" defaultChecked={hasDistance} />Distance</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="measurementSelections" value="calories" defaultChecked={hasCalories} />Calories</label>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <input type="number" min={1} name="targetRepsMin" defaultValue={defaults.targetRepsMin ?? defaults.targetReps ?? ""} placeholder="Min reps" className={controlClassName} />
            <input type="number" min={1} name="targetRepsMax" defaultValue={defaults.targetRepsMax ?? ""} placeholder="Max reps" className={controlClassName} />
          </div>
          <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input type="number" min={0} step="0.5" name="targetWeight" defaultValue={defaults.targetWeight ?? ""} placeholder={`Weight (${weightUnit})`} className={controlClassName} />
            <select name="targetWeightUnit" defaultValue={defaults.targetWeightUnit ?? weightUnit} className={controlClassName}>
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <input name="targetDuration" defaultValue={formatDuration(defaults.targetDurationSeconds)} placeholder="Time (sec or mm:ss)" className={`${controlClassName} col-span-2`} />
          <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input type="number" min={0} step="0.01" name="targetDistance" defaultValue={defaults.targetDistance ?? ""} placeholder="Distance" className={controlClassName} />
            <select name="targetDistanceUnit" defaultValue={defaults.targetDistanceUnit ?? distanceUnit} className={controlClassName}>
              <option value="mi">mi</option>
              <option value="km">km</option>
              <option value="m">m</option>
            </select>
          </div>
          <input type="number" min={0} step="1" name="targetCalories" defaultValue={defaults.targetCalories ?? ""} placeholder="Calories" className={`${controlClassName} col-span-2`} />
        </div>
      </details>
      <input type="hidden" name="defaultUnit" value={hasDistance ? (defaults.targetDistanceUnit ?? distanceUnit) : "mi"} />
    </div>
  );
}

export function EditableRoutineDayExerciseList({
  routineId,
  routineDayId,
  weightUnit,
  exercises,
  updateAction,
  deleteAction,
  reorderAction,
}: Props) {
  const initialOrder = useMemo(() => exercises.map((exercise) => exercise.id), [exercises]);
  const [orderedIds, setOrderedIds] = useState(initialOrder);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const reorderFormRef = useRef<HTMLFormElement | null>(null);
  const orderedExercises = orderedIds
    .map((id) => exercises.find((exercise) => exercise.id === id) ?? null)
    .filter((exercise): exercise is EditableRoutineDayExerciseItem => exercise !== null);

  const commitOrder = (nextOrderedIds: string[]) => {
    const didChange = nextOrderedIds.join(",") !== initialOrder.join(",");
    setOrderedIds(nextOrderedIds);
    if (!didChange) return;
    requestAnimationFrame(() => reorderFormRef.current?.requestSubmit());
  };

  return (
    <>
      <form ref={reorderFormRef} action={reorderAction} className="hidden">
        <input type="hidden" name="routineId" value={routineId} />
        <input type="hidden" name="routineDayId" value={routineDayId} />
        <input type="hidden" name="orderedExerciseRowIds" value={orderedIds.join(",")} />
      </form>

      <ul className="space-y-2">
        {orderedExercises.map((exercise, index) => {
          const isExpanded = expandedId === exercise.id;
          const isDragging = activeDragId === exercise.id;
          return (
            <li
              key={exercise.id}
              draggable
              onDragStart={() => setActiveDragId(exercise.id)}
              onDragEnd={() => setActiveDragId(null)}
              onDragOver={(event) => {
                event.preventDefault();
                if (!activeDragId || activeDragId === exercise.id) return;
                setOrderedIds((current) => {
                  const fromIndex = current.indexOf(activeDragId);
                  const toIndex = current.indexOf(exercise.id);
                  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return current;
                  const next = [...current];
                  const [moved] = next.splice(fromIndex, 1);
                  next.splice(toIndex, 0, moved);
                  return next;
                });
              }}
              onDrop={(event) => {
                event.preventDefault();
                setActiveDragId(null);
                commitOrder(orderedIds);
              }}
              className={cn("rounded-xl border border-border/60", isDragging ? "opacity-70" : undefined)}
            >
              <ExerciseCard
                title={exercise.name}
                subtitle={exercise.targetSummary}
                onPress={() => setSelectedExerciseId(exercise.exerciseId)}
                rightIcon={
                  <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      draggable
                      aria-label={`Reorder ${exercise.name}`}
                      title="Drag to reorder"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-[rgb(var(--bg)/0.45)] text-sm text-muted transition-colors hover:bg-[rgb(var(--bg)/0.6)]"
                    >
                      ☰
                    </button>
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      aria-label={isExpanded ? `Close editor for ${exercise.name}` : `Edit ${exercise.name}`}
                      onClick={() => setExpandedId(isExpanded ? null : exercise.id)}
                    >
                      {isExpanded ? "Close" : "Edit"}
                    </AppButton>
                    <ConfirmedServerFormButton
                      action={deleteAction}
                      hiddenFields={{ routineId, routineDayId, exerciseRowId: exercise.id }}
                      triggerLabel="Delete"
                      triggerAriaLabel={`Delete ${exercise.name}`}
                      triggerClassName="h-8 px-2 text-xs"
                      modalTitle="Delete routine day exercise?"
                      modalDescription="This will remove this exercise from the routine day."
                      confirmLabel="Delete"
                      details={`Exercise: ${exercise.name}`}
                    />
                  </div>
                }
                className="rounded-none border-0 bg-transparent shadow-none"
              >
                <p className="text-[11px] text-muted">Tap the row for exercise info. Drag to reorder.</p>
              </ExerciseCard>

              {isExpanded ? (
                <div className="border-t border-border/50 px-3 pb-3 pt-3">
                  <form action={updateAction} className="space-y-2">
                    <input type="hidden" name="routineId" value={routineId} />
                    <input type="hidden" name="routineDayId" value={routineDayId} />
                    <input type="hidden" name="exerciseRowId" value={exercise.id} />
                    <div className="space-y-2">
                      <input type="number" min={1} name="targetSets" defaultValue={exercise.defaults.targetSets ?? 1} placeholder={exercise.isCardio ? "Intervals" : "Sets"} required className={controlClassName} />
                      <RoutineTargetInputs
                        weightUnit={weightUnit}
                        distanceUnit={exercise.defaultDistanceUnit}
                        defaults={exercise.defaults}
                      />
                    </div>
                    <AppButton type="submit" variant="secondary" size="sm" className="h-8 px-3 text-xs">Save</AppButton>
                  </form>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <ExerciseInfo
        exerciseId={selectedExerciseId}
        open={Boolean(selectedExerciseId)}
        onOpenChange={(open) => {
          if (!open) setSelectedExerciseId(null);
        }}
        onClose={() => setSelectedExerciseId(null)}
        sourceContext="EditableRoutineDayExerciseList"
      />
    </>
  );
}
