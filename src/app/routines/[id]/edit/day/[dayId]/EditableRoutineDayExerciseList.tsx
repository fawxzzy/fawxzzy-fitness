"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppButton } from "@/components/ui/AppButton";
import { useToast } from "@/components/ui/ToastProvider";
import { controlClassName } from "@/components/ui/formClasses";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { MeasurementConfigurator } from "@/components/ui/measurements/MeasurementConfigurator";
import { MeasurementSummary } from "@/components/ui/measurements/MeasurementSummary";
import { EyebrowText, SubtitleText, TitleText } from "@/components/ui/text-roles";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import { getExerciseIconSrc } from "@/lib/exerciseImages";
import { sanitizeEnabledMeasurementValues } from "@/lib/measurement-sanitization";

type EditableRoutineDayExerciseItem = {
  id: string;
  exerciseId: string;
  name: string;
  targetSummary: string;
  isCardio: boolean;
  defaultDistanceUnit: "mi" | "km" | "m";
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  slug?: string | null;
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
  updateAction: (formData: FormData) => Promise<ActionResult>;
  deleteAction: (formData: FormData) => Promise<ActionResult>;
  reorderAction: (formData: FormData) => Promise<ActionResult>;
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
    <div className="space-y-3 rounded-[1rem] border border-border/35 bg-[rgb(var(--bg)/0.14)] p-3">
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
        onMetricToggle={(metric) => setActiveMetrics((current) => {
          const nextMetrics = { ...current, [metric]: !current[metric] };
          const sanitizedValues = sanitizeEnabledMeasurementValues(nextMetrics, {
            reps: values.reps,
            weight: values.weight,
            duration: values.duration,
            distance: values.distance,
            calories: values.calories,
          });
          setValues((existing) => ({
            ...existing,
            reps: sanitizedValues.reps,
            repsMax: nextMetrics.reps ? existing.repsMax : "",
            weight: sanitizedValues.weight,
            duration: sanitizedValues.duration,
            distance: sanitizedValues.distance,
            calories: sanitizedValues.calories,
          }));
          return nextMetrics;
        })}
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
        description="Choose only the optional measurements this goal needs."
      />
      {activeMetrics.reps ? <input type="number" min={1} name="targetRepsMax" value={values.repsMax} onChange={(event) => setValues((current) => ({ ...current, repsMax: event.target.value }))} placeholder="Max reps" className={controlClassName} /> : null}
      <MeasurementSummary
        values={{
          ...sanitizeEnabledMeasurementValues(activeMetrics, {
            reps: values.reps ? Number(values.reps) : null,
            weight: values.weight ? Number(values.weight) : null,
            durationSeconds: values.duration ? (values.duration.includes(":") ? Number(values.duration.split(":")[0]) * 60 + Number(values.duration.split(":")[1]) : Number(values.duration)) : null,
            distance: values.distance ? Number(values.distance) : null,
            calories: values.calories ? Number(values.calories) : null,
          }),
          weightUnit: values.weightUnit,
          distanceUnit: values.distanceUnit,
        }}
        emptyLabel="Goal missing"
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
  const toast = useToast();
  const router = useRouter();
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
      <div className="rounded-[1.2rem] border border-dashed border-border/45 bg-[rgb(var(--surface-2-soft)/0.42)] px-4 py-3 text-sm text-muted">
        No exercises yet. Add one below when you are ready.
      </div>
    );
  }

  return (
    <>
      <form
        action={async (formData) => {
          const result = await reorderAction(formData);
          if (!result.ok) {
            toast.error(result.error || "Could not reorder exercises.");
          }
          if (result.ok) {
            router.refresh();
          }
        }}
        className="hidden"
        ref={reorderFormRef}
      >
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
                "overflow-hidden rounded-[1.25rem] transition-all",
                isDragging ? "opacity-70" : undefined,
              )}
            >
              <div
                className={cn(
                  "overflow-hidden rounded-[1.25rem] border transition-colors",
                  isExpanded
                    ? "border-accent/40 bg-[linear-gradient(180deg,rgba(96,200,130,0.08),rgba(var(--surface-2-soft)/0.78))] shadow-[0_18px_38px_-28px_rgba(96,200,130,0.55)]"
                    : "border-border/45 bg-[rgb(var(--surface-2-soft)/0.28)]",
                )}
              >
                <ExerciseCard
                  title={exercise.name}
                  subtitle={exercise.targetSummary}
                  variant="interactive"
                  state={isExpanded ? "selected" : exercise.targetSummary === "Goal missing" ? "empty" : "default"}
                  onPress={() => setSelectedExerciseId(exercise.exerciseId)}
                  badgeText={isExpanded ? "Editing" : exercise.targetSummary === "Goal missing" ? undefined : `#${index + 1}`}
                  leadingVisual={(
                    <ExerciseAssetImage
                      src={getExerciseIconSrc(exercise)}
                      alt={`${exercise.name} icon`}
                      className="h-11 w-11 rounded-xl border border-border/35"
                      imageClassName="object-cover object-center"
                      sizes="44px"
                    />
                  )}
                  trailingClassName="self-start pt-0.5"
                  className={cn(
                    listShellClasses.card,
                    "w-full rounded-[1.25rem] border-0 bg-transparent px-3.5 py-3.5 shadow-none",
                    isExpanded ? "rounded-b-none pb-2" : undefined,
                  )}
                  rightIcon={<span aria-hidden="true" className="pt-0.5 text-muted">›</span>}
                  actions={
                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-0.5">
                      <button
                        type="button"
                        draggable
                        aria-label={`Reorder ${exercise.name}`}
                        title="Drag to reorder"
                        className={cn(listShellClasses.iconAction, "h-8 w-8 rounded-full border border-border/45 bg-[rgb(var(--bg)/0.3)] text-muted hover:bg-[rgb(var(--bg)/0.46)]")}
                      >
                        ⋮⋮
                      </button>
                      <AppButton
                        type="button"
                        variant={isExpanded ? "secondary" : "ghost"}
                        size="sm"
                        className="min-w-[4.4rem] self-start"
                        aria-label={isExpanded ? `Finish editing ${exercise.name}` : `Edit ${exercise.name}`}
                        onClick={() => setExpandedId(isExpanded ? null : exercise.id)}
                      >
                        {isExpanded ? "Done" : "Edit"}
                      </AppButton>
                      <ConfirmedServerFormButton
                        action={deleteAction}
                        onSuccess={() => router.refresh()}
                        hiddenFields={{ routineId, routineDayId, exerciseRowId: exercise.id }}
                        triggerLabel="Delete"
                        triggerAriaLabel={`Delete ${exercise.name}`}
                        triggerClassName="min-w-[3.8rem] self-start"
                        modalTitle="Delete routine day exercise?"
                        modalDescription="This will remove this exercise from the routine day."
                        confirmLabel="Delete"
                        details={`Exercise: ${exercise.name}`}
                      />
                    </div>
                  }
                />

                {isExpanded ? (
                  <div className="border-t border-border/30 px-3.5 pb-3.5 pt-2 sm:px-4">
                    <form
                      action={async (formData) => {
                        const result = await updateAction(formData);
                        toastActionResult(toast, result, {
                          success: "Exercise draft updated.",
                          error: "Could not update exercise.",
                        });
                        if (result.ok) {
                          setExpandedId(null);
                          router.refresh();
                        }
                      }}
                      className="space-y-3"
                    >
                      <input type="hidden" name="routineId" value={routineId} />
                      <input type="hidden" name="routineDayId" value={routineDayId} />
                      <input type="hidden" name="exerciseRowId" value={exercise.id} />
                      <div className="space-y-3 rounded-[1rem] border border-border/30 bg-[rgb(var(--bg)/0.12)] p-3">
                        <div className="space-y-1">
                          <EyebrowText>Planned workout</EyebrowText>
                          <TitleText as="p" className="text-sm">Editing this exercise</TitleText>
                          <SubtitleText className="text-xs">Adjust the draft goal here, then finish this row. Day updates save automatically.</SubtitleText>
                        </div>
                        <div className="rounded-2xl border border-border/35 bg-[rgb(var(--bg)/0.12)] px-3 py-2">
                          <EyebrowText>Sets</EyebrowText>
                          <input type="number" min={1} name="targetSets" defaultValue={exercise.defaults.targetSets ?? 1} placeholder={exercise.isCardio ? "Intervals" : "Sets"} required className={`${controlClassName} mt-2`} />
                        </div>
                        <RoutineTargetInputs
                          weightUnit={weightUnit}
                          distanceUnit={exercise.defaultDistanceUnit}
                          defaults={exercise.defaults}
                        />
                      </div>
                      <div className="flex justify-end">
                        <AppButton type="submit" variant="secondary" size="sm">Done editing</AppButton>
                      </div>
                    </form>
                  </div>
                ) : null}
              </div>
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
