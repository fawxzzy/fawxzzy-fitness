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
import { DestructiveButton, PrimaryButton, SecondaryButton } from "@/components/ui/AppButton";
import { ModifyMeasurements, type MeasurementMetrics, type MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { toastActionResult } from "@/lib/action-feedback";
import { formatDurationClock } from "@/lib/duration";
import { formatCount, formatDateShort, formatDurationShort, formatSetDisplay } from "@/lib/formatting";
import type { SessionSummary } from "../session-summary";

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

const formatSetSummary = (set: EditableSet, measurementType: AuditExercise["measurement_type"], defaultUnit: AuditExercise["default_unit"]) => {
  const weight = Number(set.values.weight);
  const reps = Number(set.values.reps);

  const weightedDisplay = formatSetDisplay({ weight, reps, unit: set.values.weightUnit });
  if (weightedDisplay) return weightedDisplay;

  if ((measurementType === "time" || measurementType === "time_distance") && set.source.duration_seconds !== null) {
    return formatDurationClock(set.source.duration_seconds);
  }

  if ((measurementType === "distance" || measurementType === "time_distance") && set.source.distance !== null) {
    return `${set.source.distance} ${set.source.distance_unit ?? defaultUnit ?? "mi"}`;
  }

  if (set.source.calories !== null) return `${set.source.calories} cal`;

  return "—";
};

const toSetPayload = (set: EditableSet) => {
  const parsedDuration = parseDurationInput(set.values.duration);
  const nextDuration = set.values.duration.trim() ? parsedDuration : null;

  return {
    weight: Number(set.values.weight),
    reps: Number(set.values.reps),
    durationSeconds: nextDuration,
    distance: set.values.distance.trim() ? Number(set.values.distance) : null,
    distanceUnit: set.values.distance.trim() ? set.values.distanceUnit : null,
    calories: set.values.calories.trim() ? Number(set.values.calories) : null,
    weightUnit: set.values.weightUnit,
    hasDurationError: set.values.duration.trim().length > 0 && parsedDuration === null,
  };
};

const isSetChanged = (set: EditableSet, payload: ReturnType<typeof toSetPayload>) => (
  payload.weight !== set.source.weight
  || payload.reps !== set.source.reps
  || payload.durationSeconds !== set.source.duration_seconds
  || payload.distance !== set.source.distance
  || payload.distanceUnit !== set.source.distance_unit
  || payload.calories !== set.source.calories
  || payload.weightUnit !== (set.source.weight_unit ?? payload.weightUnit)
);

export function LogAuditClient({
  logId,
  initialDayName,
  initialNotes,
  unitLabel,
  exerciseNameMap,
  exercises,
  exerciseOptions,
  sessionSummary,
  initialIsEditing,
  backHref,
}: {
  logId: string;
  initialDayName: string;
  initialNotes: string | null;
  unitLabel: "lbs" | "kg";
  exerciseNameMap: Record<string, string>;
  exercises: AuditExercise[];
  exerciseOptions: Array<{ id: string; name: string; user_id: string | null; is_global: boolean }>;
  sessionSummary: SessionSummary;
  initialIsEditing: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [dayName, setDayName] = useState(initialDayName);
  const [sessionNotes, setSessionNotes] = useState(initialNotes ?? "");
  const [selectedExerciseId, setSelectedExerciseId] = useState(exerciseOptions[0]?.id ?? "");
  const [exerciseToDelete, setExerciseToDelete] = useState<{ id: string; name: string } | null>(null);
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.notes ?? ""])));
  const [editableSets, setEditableSets] = useState<Record<string, EditableSet[]>>(
    Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.sets.map((set) => toEditableSet(set, unitLabel, exercise.measurement_type))])),
  );

  const handleCancel = () => {
    setIsEditing(false);
    setDayName(initialDayName);
    setSessionNotes(initialNotes ?? "");
    setExerciseNotes(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.notes ?? ""])));
    setEditableSets(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.sets.map((set) => toEditableSet(set, unitLabel, exercise.measurement_type))])));
    setExpandedSetId(null);
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

      for (const exercise of exercises) {
        const setsForExercise = editableSets[exercise.id] ?? [];

        for (const set of setsForExercise) {
          if (set.id.startsWith("temp-")) continue;
          const payload = toSetPayload(set);

          if (payload.hasDurationError) {
            toast.error("Use seconds or mm:ss for duration.");
            return;
          }

          if (!isSetChanged(set, payload)) continue;

          const result = await updateLogExerciseSetAction({
            logId,
            logExerciseId: exercise.id,
            setId: set.id,
            weight: payload.weight,
            reps: payload.reps,
            durationSeconds: payload.durationSeconds,
            distance: payload.distance,
            distanceUnit: payload.distanceUnit,
            calories: payload.calories,
            weightUnit: payload.weightUnit,
          });

          if (!result.ok) {
            toastActionResult(toast, result, { success: "", error: "Unable to save set changes." });
            return;
          }
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

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const previous = editableSets[exerciseId] ?? [];
    setEditableSets((current) => ({ ...current, [exerciseId]: (current[exerciseId] ?? []).filter((set) => set.id !== setId) }));
    setExpandedSetId((current) => (current === setId ? null : current));

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
      setExpandedSetId(createdSet.id);
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

  const summaryParts = [
    sessionSummary.durationSec ? formatDurationShort(sessionSummary.durationSec) : null,
    formatCount(sessionSummary.exerciseCount, "exercise"),
    formatCount(sessionSummary.setCount, "set"),
    sessionSummary.prCount > 0 ? formatCount(sessionSummary.prCount, "PR") : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <>
      <main className="space-y-3">
        <AppPanel className={`relative space-y-3 p-4 ${isEditing ? "border-[rgb(var(--button-primary-border)/0.8)] bg-[rgb(var(--glass-tint-rgb)/0.68)]" : ""}`}>
          <div className="absolute right-3 top-3">
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
          </div>
        ) : (
          <div className="flex flex-col items-start justify-start space-y-1 pr-14 text-left">
            <p className="line-clamp-2 text-base font-semibold text-[rgb(var(--text)/0.98)]">{sessionSummary.routineTitle}</p>
            <p className="line-clamp-2 text-sm text-[rgb(var(--text-muted)/0.9)]">{sessionSummary.dayTitle ? `${sessionSummary.dayTitle} — ${formatDateShort(sessionSummary.startedAt)}` : formatDateShort(sessionSummary.startedAt)}</p>
            <p className="line-clamp-1 text-xs text-[rgb(var(--text-muted)/0.75)]">{summaryParts.join(" • ")}</p>
          </div>
        )}
      </AppPanel>

      {!isEditing && sessionNotes.trim().length > 0 ? (
        <AppPanel className="space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted)/0.78)]">Session Notes</p>
          <p className="text-sm text-[rgb(var(--text)/0.94)]">{sessionNotes}</p>
        </AppPanel>
      ) : null}

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
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 text-left"
                          onClick={() => setExpandedSetId((current) => (current === set.id ? null : set.id))}
                        >
                          <p className="text-xs font-medium text-slate-400">Set {index + 1}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[rgb(var(--text)/0.9)]">{formatSetSummary(set, exercise.measurement_type, exercise.default_unit)}</span>
                            <span className="text-xs text-slate-400">{expandedSetId === set.id ? "▾" : "▸"}</span>
                          </div>
                        </button>

                        {expandedSetId === set.id ? (
                          <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
                            <ModifyMeasurements
                              values={set.values}
                              activeMetrics={set.activeMetrics}
                              isExpanded={set.isMetricsExpanded}
                              onExpandedChange={(nextExpanded) => updateEditableSet(exercise.id, set.id, (current) => ({ ...current, isMetricsExpanded: nextExpanded }))}
                              onMetricToggle={(metric) => updateEditableSet(exercise.id, set.id, (current) => ({ ...current, activeMetrics: { ...current.activeMetrics, [metric]: !current.activeMetrics[metric] } }))}
                              onChange={(patch) => updateEditableSet(exercise.id, set.id, (current) => ({ ...current, values: { ...current.values, ...patch } }))}
                            />
                            <div className="grid grid-cols-1 gap-2">
                              <DestructiveButton type="button" size="md" className="w-full" disabled={set.id.startsWith("temp-")} onClick={(event) => { event.stopPropagation(); handleDeleteSet(exercise.id, set.id); }}>Delete Set</DestructiveButton>
                            </div>
                          </div>
                        ) : null}
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
      </main>

      <BottomActionBar variant="sticky">
        {isEditing ? (
          <div className="grid w-full grid-cols-2 gap-2">
            <SecondaryButton type="button" size="md" className="w-full min-h-[44px]" onClick={handleCancel} disabled={isPending}>Cancel</SecondaryButton>
            <PrimaryButton type="button" size="md" className="w-full min-h-[44px]" onClick={handleSave} disabled={isPending}>{isPending ? "Saving..." : "Save"}</PrimaryButton>
          </div>
        ) : (
          <>
            <SecondaryButton
              type="button"
              size="md"
              className="w-full min-h-[44px] justify-center text-center"
              onClick={() => {
                const firstSet = exercises.flatMap((exercise) => editableSets[exercise.id] ?? [])[0];
                setExpandedSetId(firstSet?.id ?? null);
                setIsEditing(true);
              }}
            >
              Edit
            </SecondaryButton>
            <ConfirmedServerFormButton
              action={deleteCompletedSessionAction}
              hiddenFields={{ sessionId: logId }}
              triggerLabel="Delete"
              triggerAriaLabel="Delete log"
              triggerClassName={getAppButtonClassName({ variant: "destructive", size: "md", className: "w-full min-h-[44px] justify-center text-center" })}
              modalTitle="Delete log?"
              modalDescription="This will permanently delete this workout session and all logged sets."
              confirmLabel="Delete"
              contextLines={[`${sessionSummary.routineTitle}`, `${formatDateShort(sessionSummary.startedAt)}${sessionSummary.durationSec ? ` • ${formatDurationShort(sessionSummary.durationSec)}` : ""}`]}
            />
          </>
        )}
      </BottomActionBar>

    </>
  );
}
