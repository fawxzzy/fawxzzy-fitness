"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppButton } from "@/components/ui/AppButton";
import { SwipeActionRow } from "@/components/ui/SwipeActionRow";
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

type DragState = {
  id: string;
  pointerId: number;
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
  const reorderFormRef = useRef<HTMLFormElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [items, setItems] = useState(exercises);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setItems(exercises);
  }, [exercises]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setIsDesktop(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  const orderedIds = useMemo(() => items.map((exercise) => exercise.id), [items]);
  const initialOrder = useMemo(() => exercises.map((exercise) => exercise.id), [exercises]);

  const persistOrder = (nextItems: EditableRoutineDayExerciseItem[]) => {
    setItems(nextItems);
    requestAnimationFrame(() => reorderFormRef.current?.requestSubmit());
  };

  const updateLocalItem = (exerciseId: string, updater: (item: EditableRoutineDayExerciseItem) => EditableRoutineDayExerciseItem) => {
    setItems((current) => current.map((item) => item.id === exerciseId ? updater(item) : item));
  };

  const moveItem = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === draggedId);
      const toIndex = current.findIndex((item) => item.id === targetId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const finishReorder = () => {
    setActiveDragId(null);
    dragStateRef.current = null;
    if (orderedIds.join(",") !== initialOrder.join(",")) {
      persistOrder(items);
    }
  };

  const handleHandlePointerDown = (exerciseId: string, event: React.PointerEvent<HTMLButtonElement>) => {
    if (!reorderMode) return;
    dragStateRef.current = { id: exerciseId, pointerId: event.pointerId };
    setActiveDragId(exerciseId);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleHandlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const row = elementBelow?.closest("[data-exercise-row-id]") as HTMLElement | null;
    const targetId = row?.dataset.exerciseRowId;
    if (targetId) moveItem(dragState.id, targetId);
    event.preventDefault();
  };

  const handleHandlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    finishReorder();
  };

  useEffect(() => {
    if (!reorderMode) {
      setActiveDragId(null);
      dragStateRef.current = null;
      return;
    }
    setOpenRowId(null);
    setExpandedId(null);
    setSelectedExerciseId(null);
  }, [reorderMode]);

  const handleToggleReorderMode = () => {
    if (!reorderMode) {
      setOpenRowId(null);
      setExpandedId(null);
      setSelectedExerciseId(null);
    }
    setReorderMode((current) => !current);
  };

  if (items.length === 0) {
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
            setItems(exercises);
            return;
          }
          toast.success("Exercise order updated.");
          router.refresh();
        }}
        className="hidden"
        ref={reorderFormRef}
      >
        <input type="hidden" name="routineId" value={routineId} />
        <input type="hidden" name="routineDayId" value={routineDayId} />
        <input type="hidden" name="orderedExerciseRowIds" value={orderedIds.join(",")} />
      </form>

      <div className="mb-3 flex items-center justify-between gap-3 rounded-[1.1rem] border border-border/35 bg-[rgb(var(--surface-2-soft)/0.3)] px-3 py-2.5">
        <SubtitleText className="text-xs">{reorderMode ? "Reorder mode is on." : `${items.length} exercise${items.length === 1 ? "" : "s"}`}</SubtitleText>
        <AppButton type="button" variant={reorderMode ? "secondary" : "ghost"} size="sm" onClick={handleToggleReorderMode}>
          {reorderMode ? "Done" : "Reorder"}
        </AppButton>
      </div>

      <ul className="space-y-2">
        {items.map((exercise, index) => {
          const isExpanded = expandedId === exercise.id;
          const isDragging = activeDragId === exercise.id;
          return (
            <li
              key={exercise.id}
              data-exercise-row-id={exercise.id}
              className={cn("overflow-hidden rounded-[1.25rem] transition-all", isDragging ? "scale-[0.99] opacity-80" : undefined)}
            >
              <SwipeActionRow
                id={exercise.id}
                isDesktop={isDesktop}
                isOpen={!reorderMode && openRowId === exercise.id}
                onOpenChange={reorderMode ? () => undefined : setOpenRowId}
                disabled={reorderMode}
                trailingWidthMobile={156}
                trailingWidthDesktop={170}
                trailingActions={reorderMode ? null : (
                  <div className={cn(
                    "flex h-full items-center justify-end gap-2 rounded-[1.3rem] border border-border/30 bg-[rgb(var(--surface-2-soft)/0.96)] p-1.5 shadow-[inset_0_0_0_1px_rgba(var(--bg),0.08)] transition-opacity duration-200",
                    isDesktop ? "w-[10.625rem]" : "w-[9.75rem]",
                    openRowId === exercise.id ? "opacity-100" : "opacity-0 group-focus-within/swipe-row:opacity-100 group-hover/swipe-row:opacity-100",
                  )}>
                    <AppButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-full min-h-[2.35rem] flex-1 rounded-xl"
                      onClick={() => {
                        setOpenRowId(null);
                        setExpandedId((current) => current === exercise.id ? null : exercise.id);
                      }}
                    >
                      {isExpanded ? "Done" : "Edit"}
                    </AppButton>
                    <ConfirmedServerFormButton
                      action={deleteAction}
                      hiddenFields={{ routineId, routineDayId, exerciseRowId: exercise.id }}
                      triggerLabel="Delete"
                      triggerAriaLabel={`Delete ${exercise.name}`}
                      triggerClassName="h-full min-h-[2.35rem] min-w-[4.4rem] self-stretch rounded-xl"
                      modalTitle="Delete routine day exercise?"
                      modalDescription="This will remove this exercise from the routine day."
                      confirmLabel="Delete"
                      details={`Exercise: ${exercise.name}`}
                      onSuccess={() => {
                        setItems((current) => current.filter((item) => item.id !== exercise.id));
                        setExpandedId((current) => current === exercise.id ? null : current);
                        setOpenRowId(null);
                      }}
                    />
                  </div>
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
                    onPress={reorderMode ? undefined : () => setSelectedExerciseId(exercise.exerciseId)}
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
                    rightIcon={reorderMode ? (
                      <button
                        type="button"
                        aria-label={`Reorder ${exercise.name}`}
                        title="Drag to reorder"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/45 bg-[rgb(var(--bg)/0.3)] text-muted hover:bg-[rgb(var(--bg)/0.46)] touch-none"
                        onPointerDown={(event) => handleHandlePointerDown(exercise.id, event)}
                        onPointerMove={handleHandlePointerMove}
                        onPointerUp={handleHandlePointerUp}
                        onPointerCancel={() => finishReorder()}
                      >
                        ⋮⋮
                      </button>
                    ) : <span aria-hidden="true" className="pt-0.5 text-muted">›</span>}
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
                            const targetSets = Number(formData.get("targetSets") ?? exercise.defaults.targetSets ?? 1);
                            updateLocalItem(exercise.id, (item) => ({
                              ...item,
                              targetSummary: item.targetSummary === "Goal missing" ? "Updated goal" : item.targetSummary,
                              defaults: {
                                ...item.defaults,
                                targetSets,
                              },
                            }));
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
                          <RoutineTargetInputs weightUnit={weightUnit} distanceUnit={exercise.defaultDistanceUnit} defaults={exercise.defaults} />
                        </div>
                        <div className="flex justify-end">
                          <AppButton type="submit" variant="secondary" size="sm">Done editing</AppButton>
                        </div>
                      </form>
                    </div>
                  ) : null}
                </div>
              </SwipeActionRow>
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
