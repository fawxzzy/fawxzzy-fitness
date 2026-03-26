"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { BottomActionDock, DockButton } from "@/components/layout/BottomActionDock";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { useToast } from "@/components/ui/ToastProvider";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { MeasurementConfigurator } from "@/components/ui/measurements/MeasurementConfigurator";
import { GoalSummaryInline } from "@/components/ui/measurements/GoalSummaryInline";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import { getExerciseIconSrc } from "@/lib/exerciseImages";
import { formatGoalInlineSummaryText } from "@/lib/measurement-display";
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
  initialIsRest: boolean;
  addExerciseHref: string;
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
  defaultSets,
  defaults,
  isCardio,
}: {
  weightUnit: "lbs" | "kg";
  distanceUnit: "mi" | "km" | "m";
  defaultSets: number;
  defaults: EditableRoutineDayExerciseItem["defaults"];
  isCardio: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [sets, setSets] = useState(String(defaultSets));
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
  const summaryValues = sanitizeEnabledMeasurementValues(activeMetrics, {
    reps: values.reps ? Number(values.reps) : null,
    weight: values.weight ? Number(values.weight) : null,
    durationSeconds: values.duration ? (values.duration.includes(":") ? Number(values.duration.split(":")[0]) * 60 + Number(values.duration.split(":")[1]) : Number(values.duration)) : null,
    distance: values.distance ? Number(values.distance) : null,
    calories: values.calories ? Number(values.calories) : null,
  });

  return (
    <div className="space-y-3">
      {Object.entries(activeMetrics).map(([metric, enabled]) => enabled ? <input key={metric} type="hidden" name="measurementSelections" value={metric} /> : null)}
      <MeasurementConfigurator
        values={{
          reps: values.reps,
          repsMax: values.repsMax,
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
          repsMax: "targetRepsMax",
          weight: "targetWeight",
          duration: "targetDuration",
          distance: "targetDistance",
          calories: "targetCalories",
          weightUnit: "targetWeightUnit",
          distanceUnit: "targetDistanceUnit",
        }}
        showHeader={false}
        description={undefined}
        topField={{
          title: "Sets",
          suffix: "target",
          input: (
            <input
              type="number"
              min={1}
              name="targetSets"
              value={sets}
              onChange={(event) => setSets(event.target.value)}
              placeholder="Sets"
              required
              className="input-no-spinner h-10 w-full rounded-lg border border-emerald-300/30 bg-[rgb(var(--bg)/0.48)] px-3 text-base font-semibold tabular-nums text-text placeholder:text-[rgb(var(--text)/0.24)] focus-visible:border-emerald-300/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25"
            />
          ),
        }}
      />
      <GoalSummaryInline
        values={{
          ...summaryValues,
          sets: sets ? Number(sets) : null,
          repsMax: activeMetrics.reps && values.repsMax ? Number(values.repsMax) : null,
          weightUnit: values.weightUnit,
          distanceUnit: values.distanceUnit,
          emptyLabel: "-",
        }}
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
  initialIsRest,
  addExerciseHref,
}: Props) {
  const toast = useToast();
  const router = useRouter();
  const reorderFormRef = useRef<HTMLFormElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [items, setItems] = useState(exercises);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [isRestDay, setIsRestDay] = useState(initialIsRest);
  const [reorderMode, setReorderMode] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeEditFormRef = useRef<HTMLFormElement | null>(null);
  const pendingSnapshotRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef<Record<string, string>>({});

  useEffect(() => {
    setItems(exercises);
  }, [exercises]);

  useEffect(() => {
    setIsRestDay(initialIsRest);
  }, [initialIsRest]);

  useEffect(() => () => {
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
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
    setExpandedId(null);
    setSelectedExerciseId(null);
  }, [reorderMode]);

  useEffect(() => {
    if (isRestDay) {
      setReorderMode(false);
      setExpandedId(null);
      setSelectedExerciseId(null);
    }
  }, [isRestDay]);

  useEffect(() => {
    if (expandedId) {
      setReorderMode(false);
    }
  }, [expandedId]);

  const handleToggleReorderMode = () => {
    if (isRestDay) return;
    setExpandedId(null);
    setSelectedExerciseId(null);
    setReorderMode((current) => !current);
  };

  const createDraftSnapshot = (formData: FormData) => {
    const trackedKeys = [
      "targetSets",
      "targetRepsMin",
      "targetRepsMax",
      "targetWeight",
      "targetDuration",
      "targetDistance",
      "targetCalories",
      "targetWeightUnit",
      "targetDistanceUnit",
    ];
    const snapshotPayload = {
      fields: Object.fromEntries(trackedKeys.map((key) => [key, String(formData.get(key) ?? "").trim()])),
      measurementSelections: formData.getAll("measurementSelections").map((value) => String(value)).sort(),
    };
    return JSON.stringify(snapshotPayload);
  };

  const flushAutosave = () => {
    if (!expandedId || !activeEditFormRef.current) return;
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    const formData = new FormData(activeEditFormRef.current);
    const snapshot = createDraftSnapshot(formData);
    const lastSavedSnapshot = lastSavedSnapshotRef.current[expandedId] ?? null;
    if (snapshot === lastSavedSnapshot) {
      pendingSnapshotRef.current = null;
      return;
    }
    pendingSnapshotRef.current = snapshot;
    activeEditFormRef.current.requestSubmit();
  };

  const scheduleAutosave = () => {
    if (!expandedId || !activeEditFormRef.current) return;
    const formData = new FormData(activeEditFormRef.current);
    const snapshot = createDraftSnapshot(formData);
    const lastSavedSnapshot = lastSavedSnapshotRef.current[expandedId] ?? null;
    if (snapshot === lastSavedSnapshot) {
      pendingSnapshotRef.current = null;
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
      return;
    }
    pendingSnapshotRef.current = snapshot;
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      activeEditFormRef.current?.requestSubmit();
    }, 500);
  };

  const handleCloseInlineEditor = () => {
    flushAutosave();
    setExpandedId(null);
  };

  const editModeActive = expandedId !== null;
  const activeExercise = useMemo(
    () => items.find((exercise) => exercise.id === expandedId) ?? null,
    [expandedId, items],
  );
  const visibleItems = useMemo(() => {
    if (!editModeActive || !expandedId) return items;
    return items.filter((exercise) => exercise.id === expandedId);
  }, [editModeActive, expandedId, items]);


  const shouldShowAddExerciseAction = !reorderMode && !editModeActive;
  const isMissingGoalSummary = (summary: string) => summary === "Goal missing" || summary === "-";

  if (items.length === 0) {
    return (
      <>
        <PublishBottomActions>
          {editModeActive && activeExercise ? (
            <BottomActionDock
              left={(
                <DockButton type="button" variant="secondary" onClick={() => setSelectedExerciseId(activeExercise.exerciseId)}>
                  View Exercise
                </DockButton>
              )}
              right={(
                <DockButton type="button" variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                  Delete Exercise
                </DockButton>
              )}
            />
          ) : shouldShowAddExerciseAction ? (
            <BottomActionSingle>
              <BottomDockButton type="button" variant="primary" onClick={() => router.push(addExerciseHref)}>
                Add Exercise
              </BottomDockButton>
            </BottomActionSingle>
          ) : null}
        </PublishBottomActions>
        <div className="rounded-[1.2rem] border border-dashed border-border/45 bg-[rgb(var(--surface-2-soft)/0.42)] px-4 py-3 text-sm text-muted">
          No exercises yet. Add one below when you are ready.
        </div>
      </>
    );
  }

  return (
    <>
      <PublishBottomActions>
        {editModeActive && activeExercise ? (
          <BottomActionDock
            left={(
              <DockButton type="button" variant="secondary" onClick={() => setSelectedExerciseId(activeExercise.exerciseId)}>
                View Exercise
              </DockButton>
            )}
            right={(
              <DockButton type="button" variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                Delete Exercise
              </DockButton>
            )}
          />
        ) : shouldShowAddExerciseAction ? (
          <BottomActionSingle>
            <BottomDockButton type="button" variant="primary" onClick={() => router.push(addExerciseHref)}>
              Add Exercise
            </BottomDockButton>
          </BottomActionSingle>
        ) : null}
      </PublishBottomActions>
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

      <div className="mb-2 flex items-center justify-end gap-3 px-1">
        {editModeActive ? (
          <button
            type="button"
            aria-label="Close exercise editor"
            onClick={handleCloseInlineEditor}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-lg text-muted transition hover:bg-white/[0.06] hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25"
          >
            ←
          </button>
        ) : (
          <button
            type="button"
            onClick={handleToggleReorderMode}
            aria-pressed={reorderMode}
            disabled={isRestDay}
            className={cn(
              "inline-flex min-h-8 items-center justify-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition",
              reorderMode
                ? "border-emerald-400/40 bg-emerald-400/14 text-emerald-100"
                : "border-white/12 bg-white/[0.04] text-muted hover:bg-white/[0.06] hover:text-text",
              isRestDay ? "cursor-not-allowed opacity-55 hover:bg-white/[0.04] hover:text-muted" : undefined,
            )}
          >
            {reorderMode ? "Done" : "Reorder"}
          </button>
        )}
      </div>

      {isRestDay ? null : (
      <ul className="space-y-2">
        {visibleItems.map((exercise, index) => {
          const isExpanded = expandedId === exercise.id;
          const isDragging = activeDragId === exercise.id;
          return (
            <li
              key={exercise.id}
              data-exercise-row-id={exercise.id}
              className={cn("rounded-[1.3rem] transition-all", isDragging ? "scale-[0.99] opacity-80" : undefined)}
            >
                <div
                  className={cn(
                    "overflow-hidden rounded-[1.25rem] border transition-colors",
                    isExpanded
                      ? "border-emerald-400/40 bg-[linear-gradient(180deg,rgba(96,200,130,0.08),rgba(var(--surface-2-soft)/0.78))] shadow-[0_18px_38px_-28px_rgba(96,200,130,0.55)]"
                      : "border-border/45 bg-[rgb(var(--surface-2-soft)/0.28)]",
                  )}
                >
                  <ExerciseCard
                    title={exercise.name}
                    subtitle={exercise.targetSummary}
                    variant="interactive"
                    state={isExpanded ? "selected" : isMissingGoalSummary(exercise.targetSummary) ? "empty" : "default"}
                    onPress={reorderMode ? undefined : () => setExpandedId((current) => current === exercise.id ? null : exercise.id)}
                    badgeText={isExpanded ? "Editing" : isMissingGoalSummary(exercise.targetSummary) ? undefined : `#${index + 1}`}
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
                        ref={(node) => {
                          if (isExpanded) activeEditFormRef.current = node;
                        }}
                        action={async (formData) => {
                          const result = await updateAction(formData);
                          if (!result.ok) {
                            const nextError = result.error ?? "Could not update exercise.";
                            setAutosaveError(nextError);
                            toast.error(nextError);
                            return;
                          }

                          setAutosaveError(null);
                          if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
                          if (result.ok) {
                            const snapshot = pendingSnapshotRef.current ?? createDraftSnapshot(formData);
                            lastSavedSnapshotRef.current[exercise.id] = snapshot;
                            pendingSnapshotRef.current = null;
                            const targetSets = Number(formData.get("targetSets") ?? exercise.defaults.targetSets ?? 1);
                            const parseOptionalNumber = (value: FormDataEntryValue | null) => {
                              const raw = String(value ?? "").trim();
                              if (!raw) return null;
                              const parsed = Number(raw);
                              return Number.isFinite(parsed) ? parsed : null;
                            };
                            const targetRepsMin = parseOptionalNumber(formData.get("targetRepsMin"));
                            const targetRepsMax = parseOptionalNumber(formData.get("targetRepsMax"));
                            const targetWeight = parseOptionalNumber(formData.get("targetWeight"));
                            const targetDuration = String(formData.get("targetDuration") ?? "");
                            const targetDistance = parseOptionalNumber(formData.get("targetDistance"));
                            const targetCalories = parseOptionalNumber(formData.get("targetCalories"));
                            const targetWeightUnit = String(formData.get("targetWeightUnit") ?? weightUnit);
                            const targetDistanceUnit = String(formData.get("targetDistanceUnit") ?? exercise.defaultDistanceUnit);
                            const measurementSelections = new Set(formData.getAll("measurementSelections").map((value) => String(value)));
                            const durationRaw = targetDuration.trim();
                            const durationSeconds = durationRaw
                              ? (durationRaw.includes(":")
                                ? Number(durationRaw.split(":")[0]) * 60 + Number(durationRaw.split(":")[1])
                                : Number(durationRaw))
                              : null;
                            const summary = formatGoalInlineSummaryText({
                              sets: Number.isFinite(targetSets) ? targetSets : null,
                              reps: measurementSelections.has("reps") ? targetRepsMin : null,
                              repsMax: measurementSelections.has("reps") ? targetRepsMax : null,
                              weight: measurementSelections.has("weight") ? targetWeight : null,
                              durationSeconds: measurementSelections.has("time") && Number.isFinite(durationSeconds) ? durationSeconds : null,
                              distance: measurementSelections.has("distance") ? targetDistance : null,
                              calories: measurementSelections.has("calories") ? targetCalories : null,
                              weightUnit: targetWeightUnit,
                              distanceUnit: targetDistanceUnit,
                              emptyLabel: "-",
                            });
                            updateLocalItem(exercise.id, (item) => ({
                              ...item,
                              targetSummary: summary,
                              defaults: {
                                ...item.defaults,
                                targetSets,
                              },
                            }));
                            router.refresh();
                          }
                        }}
                        className="space-y-3"
                        onChangeCapture={scheduleAutosave}
                        onBlurCapture={flushAutosave}
                      >
                        <input type="hidden" name="routineId" value={routineId} />
                        <input type="hidden" name="routineDayId" value={routineDayId} />
                        <input type="hidden" name="exerciseRowId" value={exercise.id} />
                        <RoutineTargetInputs
                          weightUnit={weightUnit}
                          distanceUnit={exercise.defaultDistanceUnit}
                          defaultSets={exercise.defaults.targetSets ?? 1}
                          defaults={exercise.defaults}
                          isCardio={exercise.isCardio}
                        />
                        {autosaveError ? <p className="text-xs text-rose-300">{autosaveError}</p> : null}
                      </form>
                    </div>
                  ) : null}
                </div>
            </li>
          );
        })}
      </ul>
      )}

      <ConfirmDestructiveModal
        open={deleteConfirmOpen}
        title="Delete routine day exercise?"
        description="This will remove this exercise from the routine day."
        confirmLabel="Delete"
        details={activeExercise ? `Exercise: ${activeExercise.name}` : undefined}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          if (!activeExercise) {
            setDeleteConfirmOpen(false);
            return;
          }
          const formData = new FormData();
          formData.set("routineId", routineId);
          formData.set("routineDayId", routineDayId);
          formData.set("exerciseRowId", activeExercise.id);
          const result = await deleteAction(formData);
          if (!result.ok) {
            toast.error(result.error ?? "Could not delete exercise.");
            return;
          }
          setDeleteConfirmOpen(false);
          setItems((current) => current.filter((item) => item.id !== activeExercise.id));
          setExpandedId(null);
          toast.success("Exercise removed.");
        }}
      />

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
