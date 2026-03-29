"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addLogExerciseSetAction,
  deleteCompletedSessionAction,
  deleteLogExerciseAction,
  deleteLogExerciseSetAction,
  updateLogExerciseNotesAction,
  updateLogExerciseSetAction,
  updateLogMetaAction,
} from "@/app/actions/history";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { DestructiveButton, PrimaryButton, SecondaryButton } from "@/components/ui/AppButton";
import { ModifyMeasurements, type MeasurementMetrics, type MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { useReturnNavigation } from "@/components/ui/useReturnNavigation";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { CompactLogRow } from "@/components/ui/workout-entry/CompactLogRow";
import { HistoryDetailHeader, HistorySection, buildHistorySessionMeta } from "@/components/history/HistoryShared";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { toastActionResult } from "@/lib/action-feedback";
import { formatDurationClock } from "@/lib/duration";
import { formatDateShort, formatDurationShort } from "@/lib/formatting";
import { getExerciseIconSrc } from "@/lib/exerciseImages";
import { sanitizeEnabledMeasurementValues } from "@/lib/measurement-sanitization";
import { formatMeasurementSummaryText } from "@/lib/measurement-display";
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
  exercise_name?: string | null;
  exercise_slug?: string | null;
  exercise_image_path?: string | null;
  exercise_image_icon_path?: string | null;
  exercise_image_howto_path?: string | null;
  notes: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance";
  default_unit: string | null;
  sets: AuditSet[];
};

const resolveDistanceUnit = (value: string | null | undefined): "mi" | "km" | "m" | null => {
  if (value === "mi" || value === "km" || value === "m") return value;
  return null;
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

const toSetPayload = (set: EditableSet) => {
  const sanitizedValues = sanitizeEnabledMeasurementValues(set.activeMetrics, {
    weight: set.values.weight,
    reps: set.values.reps,
    duration: set.values.duration,
    distance: set.values.distance,
    calories: set.values.calories,
  });
  const parsedDuration = parseDurationInput(sanitizedValues.duration);
  const nextDuration = sanitizedValues.duration.trim() ? parsedDuration : null;

  return {
    weight: Number(sanitizedValues.weight),
    reps: Number(sanitizedValues.reps),
    durationSeconds: nextDuration,
    distance: sanitizedValues.distance.trim() ? Number(sanitizedValues.distance) : null,
    distanceUnit: sanitizedValues.distance.trim() ? set.values.distanceUnit : null,
    calories: sanitizedValues.calories.trim() ? Number(sanitizedValues.calories) : null,
    weightUnit: set.values.weightUnit,
    hasDurationError: sanitizedValues.duration.trim().length > 0 && parsedDuration === null,
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
  sessionSummary,
  backHref
}: {
  logId: string;
  initialDayName: string;
  initialNotes: string | null;
  unitLabel: "lbs" | "kg";
  exerciseNameMap: Record<string, string>;
  exercises: AuditExercise[];
  sessionSummary: SessionSummary;
  backHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { navigateReturn } = useReturnNavigation(backHref);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [dayName, setDayName] = useState(initialDayName);
  const [sessionNotes, setSessionNotes] = useState(initialNotes ?? "");
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<{ id: string; name: string } | null>(null);
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.notes ?? ""])));
  const [editableSets, setEditableSets] = useState<Record<string, EditableSet[]>>(
    Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.sets.map((set) => toEditableSet(set, unitLabel, exercise.measurement_type))])),
  );

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDayName(initialDayName);
    setSessionNotes(initialNotes ?? "");
    setExerciseNotes(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.notes ?? ""])));
    setEditableSets(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.sets.map((set) => toEditableSet(set, unitLabel, exercise.measurement_type))])));
    setExpandedSetId(null);
  }, [exercises, initialDayName, initialNotes, unitLabel]);

  const handleSave = useCallback(() => {
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
      navigateReturn();
    });
  }, [dayName, editableSets, exerciseNotes, exercises, logId, navigateReturn, sessionNotes, toast]);

  const handleStartEditing = useCallback(() => {
    const firstSet = exercises.flatMap((exercise) => editableSets[exercise.id] ?? [])[0];
    setExpandedSetId(firstSet?.id ?? null);
    setIsEditing(true);
  }, [editableSets, exercises]);

  const actionsNode = useMemo(() => {
    if (isEditing) {
      return (
        <BottomActionSplit
          secondary={<SecondaryButton type="button" size="md" className="w-full" onClick={handleCancel} disabled={isPending}>Cancel</SecondaryButton>}
          primary={<PrimaryButton type="button" size="md" className="w-full" onClick={handleSave} disabled={isPending}>{isPending ? "Saving..." : "Save"}</PrimaryButton>}
        />
      );
    }

    return (
      <BottomActionSplit
        secondary={(
          <ConfirmedServerFormButton
            action={deleteCompletedSessionAction}
            hiddenFields={{ sessionId: logId }}
            triggerLabel="Delete"
            triggerAriaLabel="Delete log"
            triggerClassName={getAppButtonClassName({ variant: "destructive", size: "md", className: "w-full justify-center text-center" })}
            modalTitle="Delete log?"
            modalDescription="This will permanently delete this workout session and all logged sets."
            confirmLabel="Delete"
            contextLines={[`${sessionSummary.routineTitle}`, `${formatDateShort(sessionSummary.startedAt)}${sessionSummary.durationSec ? ` • ${formatDurationShort(sessionSummary.durationSec)}` : ""}`]}
          />
        )}
        primary={(
          <SecondaryButton
            type="button"
            size="md"
            className="w-full justify-center text-center"
            onClick={handleStartEditing}
          >
            Edit
          </SecondaryButton>
        )}
      />
    );
  }, [handleCancel, handleSave, handleStartEditing, isEditing, isPending, logId, sessionSummary.durationSec, sessionSummary.routineTitle, sessionSummary.startedAt]);

  usePublishBottomActions(actionsNode);

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
        distanceUnit: resolveDistanceUnit(exercise.default_unit) ?? "mi",
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

  const sessionMeta = buildHistorySessionMeta({
    startedAt: sessionSummary.startedAt,
    durationSec: sessionSummary.durationSec,
    exerciseCount: sessionSummary.exerciseCount,
    setCount: sessionSummary.setCount,
    prLabel: sessionSummary.prLabel,
    dayTitle: sessionSummary.dayTitle,
  });

  return (
    <>
      <HistoryDetailHeader
        eyebrow={null}
        title={sessionSummary.routineTitle}
        subtitle={sessionMeta.dateLine}
        action={<TopRightBackButton href={backHref} ariaLabel="Back to sessions" />}
        className={isEditing ? "border-[rgb(var(--button-primary-border)/0.8)] bg-[rgb(var(--glass-tint-rgb)/0.68)]" : undefined}
        meta={<p className="text-sm text-[rgb(var(--text)/0.82)]">{sessionMeta.summaryLine}</p>}
      >
        {isEditing ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Edit mode</p>
            <div className="rounded-[1.1rem] border border-white/10 bg-black/10 px-3 py-2.5">
              <p className="text-sm font-semibold text-slate-100">Session details</p>
              <div className="mt-3 space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
                  Day Name
                  <input value={dayName} onChange={(event) => setDayName(event.target.value)} className="mt-1 w-full rounded-md border border-border/45 bg-[rgb(var(--bg)/0.24)] px-3 py-2 text-sm text-text focus-visible:border-emerald-300/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
                  Session Notes
                  <textarea value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-border/45 bg-[rgb(var(--bg)/0.24)] px-3 py-2 text-sm text-text focus-visible:border-emerald-300/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" />
                </label>
              </div>
            </div>
          </div>
        ) : null}
      </HistoryDetailHeader>

      {!isEditing && sessionNotes.trim().length > 0 ? (
        <HistorySection title="Session notes">
          <p className="text-sm text-[rgb(var(--text)/0.94)]">{sessionNotes}</p>
        </HistorySection>
      ) : null}

      <section className="space-y-2">
        {exercises.map((exercise) => {
          const name = exerciseNameMap[exercise.exercise_id] ?? exercise.exercise_id;
          const notesValue = exerciseNotes[exercise.id] ?? "";
          const setsForExercise = editableSets[exercise.id] ?? [];
          const isExpanded = expandedExerciseId === exercise.id;
          const latestSet = setsForExercise[setsForExercise.length - 1] ?? null;
          const latestSummary = latestSet
            ? formatMeasurementSummaryText({
              ...sanitizeEnabledMeasurementValues(latestSet.activeMetrics, {
                reps: latestSet.values.reps.trim() ? Number(latestSet.values.reps) : null,
                weight: latestSet.values.weight.trim() ? Number(latestSet.values.weight) : null,
                durationSeconds: parseDurationInput(latestSet.values.duration),
                distance: latestSet.values.distance.trim() ? Number(latestSet.values.distance) : null,
                calories: latestSet.values.calories.trim() ? Number(latestSet.values.calories) : null,
              }),
              weightUnit: latestSet.values.weightUnit,
              distanceUnit: latestSet.values.distanceUnit ?? resolveDistanceUnit(exercise.default_unit) ?? "mi",
              emptyLabel: "No measurements",
            })
            : "No measurements";
          const exerciseIconSrc = getExerciseIconSrc({
            name,
            slug: exercise.exercise_slug ?? null,
            image_path: exercise.exercise_image_path ?? null,
            image_icon_path: exercise.exercise_image_icon_path ?? null,
            image_howto_path: exercise.exercise_image_howto_path ?? null,
          });
          const subtitleParts = [
            `Latest: ${latestSummary}`,
            `${setsForExercise.length} ${setsForExercise.length === 1 ? "set" : "sets"}`,
          ];

          return (
            <article key={exercise.id} className="space-y-2">
              <ExerciseCard
                title={name}
                subtitle={subtitleParts.join(" • ")}
                onPress={() => setExpandedExerciseId((current) => (current === exercise.id ? null : exercise.id))}
                rightIcon={isExpanded
                  ? <ChevronDownIcon className="h-5 w-5 shrink-0 self-center text-[rgb(var(--text)/0.6)]" />
                  : <ChevronRightIcon className="h-5 w-5 shrink-0 self-center text-[rgb(var(--text)/0.6)]" />}
                variant="summary"
                state={isExpanded ? "selected" : "default"}
                leadingVisual={(
                  <ExerciseAssetImage
                    src={exerciseIconSrc}
                    alt={name}
                    className="h-20 w-20 shrink-0 rounded-xl border border-border/25 bg-black/10"
                    imageClassName="object-cover object-center"
                    sizes="80px"
                  />
                )}
                className="items-center"
              />

              {isExpanded ? (
                <div className="space-y-2.5 px-1.5 pb-1">
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      <SecondaryButton type="button" size="sm" onClick={() => handleAddSet(exercise)}>+ Add Set</SecondaryButton>
                      <DestructiveButton type="button" size="sm" onClick={() => setExerciseToDelete({ id: exercise.id, name })}>Delete Exercise</DestructiveButton>
                    </div>
                  ) : null}

                  <ul className="space-y-1.5 text-sm">
                    {setsForExercise.map((set, index) => (
                      <li key={set.id}>
                        {isEditing ? (
                          <div className="space-y-2">
                            <button type="button" className="block w-full text-left" onClick={() => setExpandedSetId((current) => (current === set.id ? null : set.id))}>
                              <CompactLogRow
                                label={<span className="font-semibold text-text">Set {index + 1}</span>}
                                summary={`Set ${index + 1} • ${formatMeasurementSummaryText({
                                  ...sanitizeEnabledMeasurementValues(set.activeMetrics, {
                                    reps: set.values.reps.trim() ? Number(set.values.reps) : null,
                                    weight: set.values.weight.trim() ? Number(set.values.weight) : null,
                                    durationSeconds: parseDurationInput(set.values.duration),
                                    distance: set.values.distance.trim() ? Number(set.values.distance) : null,
                                    calories: set.values.calories.trim() ? Number(set.values.calories) : null,
                                  }),
                                  weightUnit: set.values.weightUnit,
                                  distanceUnit: set.values.distanceUnit ?? resolveDistanceUnit(exercise.default_unit) ?? "mi",
                                  emptyLabel: "No measurements",
                                })}`}
                                action={<span className="text-xs text-muted">{expandedSetId === set.id ? "▾" : "▸"}</span>}
                                className="transition-colors hover:bg-[rgb(var(--surface-rgb)/0.42)]"
                              />
                            </button>

                            {expandedSetId === set.id ? (
                              <div className="space-y-2.5 px-0.5 pt-1" onClick={(event) => event.stopPropagation()}>
                                <ModifyMeasurements
                                  values={set.values}
                                  activeMetrics={set.activeMetrics}
                                  isExpanded={set.isMetricsExpanded}
                                  onExpandedChange={(nextExpanded) => updateEditableSet(exercise.id, set.id, (current) => ({ ...current, isMetricsExpanded: nextExpanded }))}
                                  onMetricToggle={(metric) => updateEditableSet(exercise.id, set.id, (current) => {
                                    const nextMetrics = { ...current.activeMetrics, [metric]: !current.activeMetrics[metric] };
                                    const sanitizedValues = sanitizeEnabledMeasurementValues(nextMetrics, {
                                      reps: current.values.reps,
                                      weight: current.values.weight,
                                      duration: current.values.duration,
                                      distance: current.values.distance,
                                      calories: current.values.calories,
                                    });
                                    return {
                                      ...current,
                                      activeMetrics: nextMetrics,
                                      values: {
                                        ...current.values,
                                        reps: sanitizedValues.reps,
                                        weight: sanitizedValues.weight,
                                        duration: sanitizedValues.duration,
                                        distance: sanitizedValues.distance,
                                        calories: sanitizedValues.calories,
                                      },
                                    };
                                  })}
                                  onChange={(patch) => updateEditableSet(exercise.id, set.id, (current) => ({ ...current, values: { ...current.values, ...patch } }))}
                                />
                                <div className="grid grid-cols-1 gap-2">
                                  <DestructiveButton type="button" size="md" className="w-full" disabled={set.id.startsWith("temp-")} onClick={(event) => { event.stopPropagation(); handleDeleteSet(exercise.id, set.id); }}>Delete Set</DestructiveButton>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <CompactLogRow
                            label={<span className="font-semibold text-text">Logged set</span>}
                            summary={`Set ${index + 1} • ${formatMeasurementSummaryText({
                              ...sanitizeEnabledMeasurementValues(set.activeMetrics, {
                                reps: set.values.reps.trim() ? Number(set.values.reps) : null,
                                weight: set.values.weight.trim() ? Number(set.values.weight) : null,
                                durationSeconds: parseDurationInput(set.values.duration),
                                distance: set.values.distance.trim() ? Number(set.values.distance) : null,
                                calories: set.values.calories.trim() ? Number(set.values.calories) : null,
                              }),
                              weightUnit: set.values.weightUnit,
                              distanceUnit: set.values.distanceUnit ?? resolveDistanceUnit(exercise.default_unit) ?? "mi",
                              emptyLabel: "No measurements",
                            })}`}
                          />
                        )}
                      </li>
                    ))}
                  </ul>

                  {isEditing ? (
                    <label className="block pt-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Exercise Notes
                      <textarea
                        value={notesValue}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setExerciseNotes((current) => ({ ...current, [exercise.id]: nextValue }));
                        }}
                        rows={2}
                        className="mt-1 w-full rounded-md border border-border/45 bg-[rgb(var(--bg)/0.22)] px-3 py-2 text-sm text-text focus-visible:border-emerald-300/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25"
                      />
                    </label>
                  ) : notesValue.trim() ? (
                    <p className="pt-2 text-xs text-[rgb(var(--text-muted)/0.75)]">Notes: {notesValue}</p>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>


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
