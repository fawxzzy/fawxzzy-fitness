"use client";

import { useMemo, useRef, useState } from "react";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppButton } from "@/components/ui/AppButton";
import { controlClassName } from "@/components/ui/formClasses";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { MeasurementConfigurator } from "@/components/ui/measurements/MeasurementConfigurator";
import { MeasurementSummary } from "@/components/ui/measurements/MeasurementSummary";
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
  const [expanded, setExpanded] = useState(true);
  const [values, setValues] = useState({
    reps: String(defaults.targetRepsMin ?? defaults.targetReps ?? ""),
    repsMax: String(defaults.targetRepsMax ?? ""),
    weight: String(defaults.targetWeight ?? ""),
    duration: formatDuration(defaults.targetDurationSeconds),
    distance: String(defaults.targetDistance ?? ""),
    calories: String(defaults.targetCalories ?? ""),
    weightUnit: defaults.targetWeightUnit ?? weightUnit,
    distanceUnit: defaults.targetDistanceUnit ?? distanceUnit,
  });
  const [activeMetrics, setActiveMetrics] = useState({
    reps: defaults.targetRepsMin != null || defaults.targetRepsMax != null || defaults.targetReps != null,
    weight: defaults.targetWeight != null,
    time: defaults.targetDurationSeconds != null,
    distance: defaults.targetDistance != null,
    calories: defaults.targetCalories != null,
  });

  return (
    <div className="space-y-3 rounded-[1rem] border border-border/40 bg-[rgb(var(--bg)/0.16)] p-3">
      {Object.entries(activeMetrics).map(([metric, enabled]) => enabled ? <input key={metric} type="hidden" name="measurementSelections" value={metric} /> : null)}
      <MeasurementConfigurator
        values={{
          reps: values.reps,
          weight: values.weight,
          duration: values.duration,
          distance: values.distance,
          calories: values.calories,
          weightUnit: values.weightUnit,
          distanceUnit: values.distanceUnit,
        }}
        activeMetrics={activeMetrics}
        isExpanded={expanded}
        onExpandedChange={setExpanded}
        onMetricToggle={(metric) => setActiveMetrics((current) => ({ ...current, [metric]: !current[metric] }))}
        onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
        names={{
          reps: "targetRepsMin",
          weight: "targetWeight",
          duration: "targetDuration",
          distance: "targetDistance",
          calories: "targetCalories",
          weightUnit: "targetWeightUnit",
          distanceUnit: "targetDistanceUnit",
        }}
        description="Keep day editor targets aligned with the same shared measurement language used in add exercise and session logging."
      />
      {activeMetrics.reps ? <input type="number" min={1} name="targetRepsMax" value={values.repsMax} onChange={(event) => setValues((current) => ({ ...current, repsMax: event.target.value }))} placeholder="Max reps" className={controlClassName} /> : null}
      <MeasurementSummary
        values={{
          reps: values.reps ? Number(values.reps) : null,
          weight: values.weight ? Number(values.weight) : null,
          weightUnit: values.weightUnit,
          distance: values.distance ? Number(values.distance) : null,
          distanceUnit: values.distanceUnit,
          calories: values.calories ? Number(values.calories) : null,
        }}
        emptyLabel="Open goal"
      />
      <input type="hidden" name="defaultUnit" value={activeMetrics.distance ? values.distanceUnit : "mi"} />
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

  if (orderedExercises.length === 0) {
    return (
      <div className="rounded-[1.2rem] border border-dashed border-border/45 bg-[rgb(var(--surface-2-soft)/0.42)] px-4 py-4 text-sm text-muted">
        No exercises planned yet. Add one below to build this day.
      </div>
    );
  }

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
              className={cn(
                "overflow-hidden rounded-[1.15rem] transition-all",
                isDragging ? "opacity-70" : undefined,
              )}
            >
              <ExerciseCard
                title={exercise.name}
                subtitle={exercise.targetSummary}
                onPress={() => setSelectedExerciseId(exercise.exerciseId)}
                badgeText={`#${index + 1}`}
                trailingClassName="self-start pt-0.5"
                className={cn(
                  "px-3 py-3",
                  listShellClasses.card,
                  "border-border/45 bg-[rgb(var(--surface-2-soft)/0.58)] shadow-[0_4px_14px_-10px_rgba(0,0,0,0.55)]",
                  isExpanded ? "rounded-b-none border-b-0" : undefined,
                )}
                rightIcon={
                  <div className="flex items-center gap-1.5 self-start" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      draggable
                      aria-label={`Reorder ${exercise.name}`}
                      title="Drag to reorder"
                      className={cn(listShellClasses.iconAction, "h-8 w-8 border border-border/45 bg-[rgb(var(--bg)/0.32)] text-muted hover:bg-[rgb(var(--bg)/0.48)]")}
                    >
                      ⋮⋮
                    </button>
                    <AppButton
                      type="button"
                      variant={isExpanded ? "secondary" : "ghost"}
                      size="sm"
                      className="min-w-[4rem]"
                      aria-label={isExpanded ? `Close editor for ${exercise.name}` : `Edit ${exercise.name}`}
                      onClick={() => setExpandedId(isExpanded ? null : exercise.id)}
                    >
                      {isExpanded ? "Done" : "Edit"}
                    </AppButton>
                    <ConfirmedServerFormButton
                      action={deleteAction}
                      hiddenFields={{ routineId, routineDayId, exerciseRowId: exercise.id }}
                      triggerLabel="Delete"
                      triggerAriaLabel={`Delete ${exercise.name}`}
                      triggerClassName="min-w-[3.8rem]"
                      modalTitle="Delete routine day exercise?"
                      modalDescription="This will remove this exercise from the routine day."
                      confirmLabel="Delete"
                      details={`Exercise: ${exercise.name}`}
                    />
                  </div>
                }
              >
                <p className="text-[11px] text-muted">Tap for exercise info. Use the handle to move it.</p>
              </ExerciseCard>

              {isExpanded ? (
                <div className="rounded-b-[1.15rem] border border-border/45 border-t-0 bg-[rgb(var(--surface-2-soft)/0.42)] px-3 pb-3 pt-2.5">
                  <form action={updateAction} className="space-y-3">
                    <input type="hidden" name="routineId" value={routineId} />
                    <input type="hidden" name="routineDayId" value={routineDayId} />
                    <input type="hidden" name="exerciseRowId" value={exercise.id} />
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Edit targets</p>
                        <p className="text-xs text-muted">Keep this exercise aligned with the same sets + measurement language used in add exercise and session logging.</p>
                      </div>
                      <input type="number" min={1} name="targetSets" defaultValue={exercise.defaults.targetSets ?? 1} placeholder={exercise.isCardio ? "Intervals" : "Sets"} required className={controlClassName} />
                      <RoutineTargetInputs
                        weightUnit={weightUnit}
                        distanceUnit={exercise.defaultDistanceUnit}
                        defaults={exercise.defaults}
                      />
                    </div>
                    <div className="flex justify-end">
                      <AppButton type="submit" variant="secondary" size="sm">Save changes</AppButton>
                    </div>
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
