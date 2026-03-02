"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addLogExerciseAction,
  addLogExerciseSetAction,
  deleteCompletedSessionAction,
  deleteLogExerciseAction,
  deleteLogExerciseSetAction,
  updateLogExerciseNotesAction,
  updateLogExerciseSetAction,
  updateLogMetaAction,
} from "@/app/actions/history";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { AppButton, DestructiveButton, PrimaryButton, SecondaryButton } from "@/components/ui/AppButton";
import { ModifyMeasurements, type MeasurementMetrics, type MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { StickyActionBar } from "@/components/ui/app/StickyActionBar";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { toastActionResult } from "@/lib/action-feedback";
import { formatDurationClock } from "@/lib/duration";

type AuditSet = {
  id: string;
  set_index: number;
  weight: number;
  reps: number;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: "mi" | "km" | "m" | null;
  calories: number | null;
  weight_unit: "lbs" | "kg" | null;
};

type EditableSet = {
  id: string;
  source: AuditSet;
  values: MeasurementValues;
  activeMetrics: MeasurementMetrics;
  isMetricsExpanded: boolean;
};

type AuditExercise = {
  id: string;
  exercise_id: string;
  notes: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance";
  default_unit: "mi" | "km" | "m" | null;
  sets: AuditSet[];
};

const metricsForMeasurementType = (measurementType: AuditExercise["measurement_type"]): MeasurementMetrics => {
  if (measurementType === "reps") return { reps: true, weight: true, time: false, distance: false, calories: false };
  if (measurementType === "time") return { reps: false, weight: false, time: true, distance: false, calories: false };
  if (measurementType === "distance") return { reps: false, weight: false, time: false, distance: true, calories: false };
  return { reps: false, weight: false, time: true, distance: true, calories: false };
};

function parseDurationInput(rawValue: string): number | null {
  const value = rawValue.trim();
  if (!value) return null;
  if (value.includes(":")) {
    const [minutesRaw, secondsRaw] = value.split(":");
    if (secondsRaw === undefined) return null;
    const minutes = Number(minutesRaw);
    const seconds = Number(secondsRaw);
    if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || seconds < 0 || seconds > 59) {
      return null;
    }
    return (minutes * 60) + seconds;
  }
  const totalSeconds = Number(value);
  if (!Number.isInteger(totalSeconds) || totalSeconds < 0) return null;
  return totalSeconds;
}

const toEditableSet = (set: AuditSet, unitLabel: "lbs" | "kg", measurementType: AuditExercise["measurement_type"]): EditableSet => ({
  id: set.id,
  source: set,
  values: {
    weight: String(set.weight),
    reps: String(set.reps),
    duration: set.duration_seconds === null ? "" : formatDurationClock(set.duration_seconds),
    distance: set.distance === null ? "" : String(set.distance),
    distanceUnit: set.distance_unit ?? "mi",
    calories: set.calories === null ? "" : String(set.calories),
    weightUnit: set.weight_unit ?? unitLabel,
  },
  activeMetrics: {
    ...metricsForMeasurementType(measurementType),
    calories: set.calories !== null,
  },
  isMetricsExpanded: false,
});

export function LogAuditClient({
  logId,
  initialDayName,
  initialNotes,
  unitLabel,
  exerciseNameMap,
  exercises,
  exerciseOptions,
  routineName,
  performedDateLabel,
  performedTimeLabel,
  durationLabel,
  backHref,
}: {
  logId: string;
  initialDayName: string;
  initialNotes: string | null;
  unitLabel: "lbs" | "kg";
  exerciseNameMap: Record<string, string>;
  exercises: AuditExercise[];
  exerciseOptions: Array<{ id: string; name: string; user_id: string | null; is_global: boolean }>;
  routineName: string;
  performedDateLabel: string;
  performedTimeLabel: string;
  durationLabel: string;
  backHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [dayName, setDayName] = useState(initialDayName);
  const [sessionNotes, setSessionNotes] = useState(initialNotes ?? "");
  const [selectedExerciseId, setSelectedExerciseId] = useState(exerciseOptions[0]?.id ?? "");
  const [exerciseToDelete, setExerciseToDelete] = useState<{ id: string; name: string } | null>(null);
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.notes ?? ""])));
  const [editableSets, setEditableSets] = useState<Record<string, EditableSet[]>>(
    Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.sets.map((set) => toEditableSet(set, unitLabel, exercise.measurement_type))])),
  );

  const formatSetSummary = (set: EditableSet, measurementType: AuditExercise["measurement_type"], defaultUnit: AuditExercise["default_unit"]) => {
    const parts: string[] = [];
    const weight = Number(set.values.weight);
    const reps = Number(set.values.reps);

    if (measurementType === "reps") {
      if (weight > 0 || reps > 0) {
        parts.push(`${set.values.weight} ${set.values.weightUnit} × ${set.values.reps}`);
      }
    } else if (reps > 0) {
      parts.push(`${set.values.reps} reps`);
    }

    if ((measurementType === "time" || measurementType === "time_distance") && set.source.duration_seconds !== null) {
      parts.push(formatDurationClock(set.source.duration_seconds));
    }

    if ((measurementType === "distance" || measurementType === "time_distance") && set.source.distance !== null) {
      parts.push(`${set.source.distance} ${set.source.distance_unit ?? defaultUnit ?? "mi"}`);
    }

    if (set.source.calories !== null) {
      parts.push(`${set.source.calories} cal`);
    }

    return parts.join(" · ") || "—";
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDayName(initialDayName);
    setSessionNotes(initialNotes ?? "");
    setExerciseNotes(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.notes ?? ""])));
    setEditableSets(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.sets.map((set) => toEditableSet(set, unitLabel, exercise.measurement_type))])));
  };

  const handleSave = () => {
    startTransition(async () => {
      const metaResult = await updateLogMetaAction({ logId, dayNameOverride: dayName, notes: sessionNotes });
      if (!metaResult.ok) {
        toastActionResult(toast, metaResult, { success: "", error: "Unable to save log details." });
        return;
      }

      for (const exercise of exercises) {
        const notesValue = (exerciseNotes[exercise.id] ?? "").trim();
        if (notesValue === (exercise.notes ?? "").trim()) continue;
        const result = await updateLogExerciseNotesAction({ logId, logExerciseId: exercise.id, notes: notesValue });
        if (!result.ok) {
          toastActionResult(toast, result, { success: "", error: "Unable to save exercise notes." });
          return;
        }
      }

      setIsEditing(false);
      toastActionResult(toast, { ok: true }, { success: "Log details saved.", error: "Unable to save log details." });
      router.refresh();
    });
  };

  const updateEditableSet = (exerciseId: string, setId: string, updater: (set: EditableSet) => EditableSet) => {
    setEditableSets((current) => ({
      ...current,
      [exerciseId]: (current[exerciseId] ?? []).map((set) => (set.id === setId ? updater(set) : set)),
    }));
  };

  const handleSaveSet = (exerciseId: string, setId: string) => {
    const currentSet = (editableSets[exerciseId] ?? []).find((set) => set.id === setId);
    if (!currentSet) return;

    const parsedDuration = parseDurationInput(currentSet.values.duration);
    const nextDuration = currentSet.values.duration.trim() ? parsedDuration : null;
    if (currentSet.values.duration.trim() && parsedDuration === null) {
      toast.error("Use seconds or mm:ss for duration.");
      return;
    }

    startTransition(async () => {
      const result = await updateLogExerciseSetAction({
        logId,
        logExerciseId: exerciseId,
        setId,
        weight: Number(currentSet.values.weight),
        reps: Number(currentSet.values.reps),
        durationSeconds: nextDuration,
        distance: currentSet.values.distance.trim() ? Number(currentSet.values.distance) : null,
        distanceUnit: currentSet.values.distance.trim() ? currentSet.values.distanceUnit : null,
        calories: currentSet.values.calories.trim() ? Number(currentSet.values.calories) : null,
        weightUnit: currentSet.values.weightUnit,
      });

      toastActionResult(toast, result, { success: "Set updated.", error: "Unable to update set." });
      if (result.ok) {
        setEditableSets((current) => ({
          ...current,
          [exerciseId]: (current[exerciseId] ?? []).map((set) => (
            set.id === setId
              ? {
                ...set,
                source: {
                  ...set.source,
                  weight: Number(currentSet.values.weight),
                  reps: Number(currentSet.values.reps),
                  duration_seconds: nextDuration,
                  distance: currentSet.values.distance.trim() ? Number(currentSet.values.distance) : null,
                  distance_unit: currentSet.values.distance.trim() ? currentSet.values.distanceUnit : null,
                  calories: currentSet.values.calories.trim() ? Number(currentSet.values.calories) : null,
                  weight_unit: currentSet.values.weightUnit,
                },
              }
              : set
          )),
        }));
      }
    });
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const previous = editableSets[exerciseId] ?? [];
    setEditableSets((current) => ({ ...current, [exerciseId]: (current[exerciseId] ?? []).filter((set) => set.id !== setId) }));

    startTransition(async () => {
      const result = await deleteLogExerciseSetAction({ logId, logExerciseId: exerciseId, setId });
      toastActionResult(toast, result, { success: "Set deleted.", error: "Unable to delete set." });
      if (!result.ok) {
        setEditableSets((current) => ({ ...current, [exerciseId]: previous }));
      }
    });
  };

  const handleAddSet = (exercise: AuditExercise) => {
    const exerciseId = exercise.id;
    const tempId = `temp-${Date.now()}`;
    const optimisticSet: EditableSet = {
      id: tempId,
      source: { id: tempId, set_index: (editableSets[exerciseId]?.length ?? 0), weight: 0, reps: 0, duration_seconds: null, distance: null, distance_unit: null, calories: null, weight_unit: unitLabel },
      values: {
        weight: "0",
        reps: "0",
        duration: "",
        distance: "",
        distanceUnit: exercise.default_unit ?? "mi",
        calories: "",
        weightUnit: unitLabel,
      },
      activeMetrics: metricsForMeasurementType(exercise.measurement_type),
      isMetricsExpanded: false,
    };

    setEditableSets((current) => ({ ...current, [exerciseId]: [...(current[exerciseId] ?? []), optimisticSet] }));

    startTransition(async () => {
      const result = await addLogExerciseSetAction({
        logId,
        logExerciseId: exerciseId,
        weight: 0,
        reps: 0,
        durationSeconds: null,
        distance: null,
        distanceUnit: null,
        calories: null,
        weightUnit: unitLabel,
      });
      toastActionResult(toast, result, { success: "Set added.", error: "Unable to add set." });
      if (!result.ok) {
        setEditableSets((current) => ({ ...current, [exerciseId]: (current[exerciseId] ?? []).filter((set) => set.id !== tempId) }));
        return;
      }

      const createdSet = result.data?.set;
      if (!createdSet) {
        router.refresh();
        return;
      }

      setEditableSets((current) => ({
        ...current,
        [exerciseId]: (current[exerciseId] ?? []).map((set) => (set.id === tempId ? toEditableSet(createdSet, unitLabel, exercise.measurement_type) : set)),
      }));
    });
  };

  const handleAddExercise = () => {
    if (!selectedExerciseId) return;
    startTransition(async () => {
      const result = await addLogExerciseAction({ logId, exerciseId: selectedExerciseId });
      toastActionResult(toast, result, { success: "Exercise added.", error: "Unable to add exercise." });
      if (result.ok) router.refresh();
    });
  };

  const handleDeleteExercise = (logExerciseId: string) => {
    startTransition(async () => {
      const result = await deleteLogExerciseAction({ logId, logExerciseId });
      toastActionResult(toast, result, { success: "Exercise removed.", error: "Unable to remove exercise." });
      if (result.ok) {
        setExerciseToDelete(null);
        router.refresh();
      }
    });
  };

  return (
    <>
      <AppPanel className={`space-y-3 p-4 ${isEditing ? "border-[rgb(var(--button-primary-border)/0.8)] bg-[rgb(var(--glass-tint-rgb)/0.68)]" : ""}`}>
        <div className="flex items-center justify-end">
          <TopRightBackButton href={backHref} ariaLabel="Back to History sessions" />
        </div>
        {isEditing ? (
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
              Day Name
              <input value={dayName} onChange={(event) => setDayName(event.target.value)} className="mt-1 w-full rounded-md border border-white/15 bg-black/15 px-3 py-2 text-sm text-slate-100" />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
              Session Notes
              <textarea value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-white/15 bg-black/15 px-3 py-2 text-sm text-slate-100" />
            </label>
            <div className="space-y-2 rounded-lg border border-white/15 bg-black/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Add Exercise</p>
              <select value={selectedExerciseId} onChange={(event) => setSelectedExerciseId(event.target.value)} className="w-full rounded-md border border-white/15 bg-black/15 px-3 py-2 text-sm text-slate-100">
                {exerciseOptions.map((option) => (<option key={option.id} value={option.id}>{option.name}</option>))}
              </select>
              <div className="flex justify-end">
                <SecondaryButton type="button" size="sm" onClick={handleAddExercise}>Add Exercise</SecondaryButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-left">
            <p className="text-base font-semibold text-[rgb(var(--text)/0.98)]">{routineName} | {durationLabel}</p>
            <p className="line-clamp-2 text-sm text-[rgb(var(--text-muted)/0.9)]">{dayName || "Day"}</p>
            <p className="text-xs text-[rgb(var(--text-muted)/0.75)]">{performedDateLabel} | {performedTimeLabel}</p>
          </div>
        )}
      </AppPanel>

      <div className="space-y-2">
        {exercises.map((exercise) => {
          const name = exerciseNameMap[exercise.exercise_id] ?? exercise.exercise_id;
          const notesValue = exerciseNotes[exercise.id] ?? "";
          const setsForExercise = editableSets[exercise.id] ?? [];

          return (
            <AppPanel key={exercise.id} className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[0.96rem] font-semibold leading-snug text-[rgb(var(--text)/0.98)]">{name}</p>
                  {isEditing ? <p className="text-xs text-[rgb(var(--text-muted)/0.78)]">Editing enabled</p> : null}
                </div>
                <AppBadge>{setsForExercise.length} SETS</AppBadge>
              </div>

              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton type="button" size="sm" onClick={() => handleAddSet(exercise)}>+ Add Set</SecondaryButton>
                  <DestructiveButton type="button" size="sm" onClick={() => setExerciseToDelete({ id: exercise.id, name })}>Delete Exercise</DestructiveButton>
                </div>
              ) : null}

              <ul className="space-y-1.5 text-sm">
                {setsForExercise.map((set, index) => (
                  <li key={set.id} className="rounded-md border border-white/10 bg-black/10 px-2.5 py-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-400">Set {index + 1}</p>
                        <ModifyMeasurements
                          values={set.values}
                          activeMetrics={set.activeMetrics}
                          isExpanded={set.isMetricsExpanded}
                          onExpandedChange={(nextExpanded) => updateEditableSet(exercise.id, set.id, (current) => ({ ...current, isMetricsExpanded: nextExpanded }))}
                          onMetricToggle={(metric) => updateEditableSet(exercise.id, set.id, (current) => ({ ...current, activeMetrics: { ...current.activeMetrics, [metric]: !current.activeMetrics[metric] } }))}
                          onChange={(patch) => updateEditableSet(exercise.id, set.id, (current) => ({ ...current, values: { ...current.values, ...patch } }))}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <AppButton type="button" variant="secondary" size="md" fullWidth onClick={() => handleSaveSet(exercise.id, set.id)}>Save Set</AppButton>
                          <DestructiveButton type="button" size="md" className="w-full" disabled={set.id.startsWith("temp-")} onClick={() => handleDeleteSet(exercise.id, set.id)}>Delete Set</DestructiveButton>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[rgb(var(--text)/0.9)]">{formatSetSummary(set, exercise.measurement_type, exercise.default_unit)}</p>
                    )}
                  </li>
                ))}
              </ul>

              {isEditing ? (
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Exercise Notes
                  <textarea
                    value={notesValue}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setExerciseNotes((current) => ({ ...current, [exercise.id]: nextValue }));
                    }}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-white/15 bg-black/10 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
              ) : notesValue.trim() ? (
                <p className="text-xs text-[rgb(var(--text-muted)/0.75)]">Notes: {notesValue}</p>
              ) : null}
            </AppPanel>
          );
        })}
      </div>

      <StickyActionBar
        mode="fixed"
        primary={(
          <div className="grid grid-cols-2 gap-2">
            {isEditing ? (
              <>
                <SecondaryButton type="button" size="md" className="w-full" onClick={handleCancel} disabled={isPending}>Cancel</SecondaryButton>
                <PrimaryButton type="button" size="md" className="w-full" onClick={handleSave} disabled={isPending}>{isPending ? "Saving..." : "Save"}</PrimaryButton>
              </>
            ) : (
              <>
                <SecondaryButton type="button" size="md" className="w-full" onClick={() => setIsEditing(true)}>Edit</SecondaryButton>
                <ConfirmedServerFormButton
                  action={deleteCompletedSessionAction}
                  hiddenFields={{ sessionId: logId }}
                  triggerLabel="Delete Log"
                  triggerAriaLabel="Delete log"
                  triggerClassName={getAppButtonClassName({ variant: "destructive", size: "md", fullWidth: true })}
                  modalTitle="Delete log?"
                  modalDescription="This will permanently delete this workout session and all logged sets."
                  confirmLabel="Delete"
                  contextLines={[`${routineName}`, `${performedDateLabel} • ${durationLabel} • ${performedTimeLabel}`]}
                />
              </>
            )}
          </div>
        )}
      />

      <ConfirmDestructiveModal
        open={exerciseToDelete !== null}
        title="Delete exercise from completed log?"
        description="This will remove the exercise and all logged sets from this completed session."
        confirmLabel="Delete"
        details={exerciseToDelete ? `Exercise: ${exerciseToDelete.name}` : undefined}
        onCancel={() => setExerciseToDelete(null)}
        onConfirm={() => {
          if (!exerciseToDelete) return;
          handleDeleteExercise(exerciseToDelete.id);
        }}
      />
    </>
  );
}
