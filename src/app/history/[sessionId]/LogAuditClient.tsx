"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppButton, DestructiveButton, GhostButton, PrimaryButton, SecondaryButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AppRow } from "@/components/ui/app/AppRow";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import { formatDurationClock } from "@/lib/duration";
import {
  addLogExerciseAction,
  addLogExerciseSetAction,
  deleteLogExerciseAction,
  deleteLogExerciseSetAction,
  updateLogExerciseNotesAction,
  updateLogExerciseSetAction,
  updateLogMetaAction,
} from "@/app/actions/history";

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
  weight: string;
  reps: string;
  durationSeconds: string;
  weightUnit: "lbs" | "kg";
};

type AuditExercise = {
  id: string;
  exercise_id: string;
  notes: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance";
  default_unit: "mi" | "km" | "m" | null;
  sets: AuditSet[];
};

export function LogAuditClient({
  logId,
  initialDayName,
  initialNotes,
  unitLabel,
  exerciseNameMap,
  exercises,
  exerciseOptions,
}: {
  logId: string;
  initialDayName: string;
  initialNotes: string | null;
  unitLabel: "lbs" | "kg";
  exerciseNameMap: Record<string, string>;
  exercises: AuditExercise[];
  exerciseOptions: Array<{
    id: string;
    name: string;
    user_id: string | null;
    is_global: boolean;
  }>;
}) {
  const formatSetSummary = (
    set: EditableSet,
    index: number,
    measurementType: "reps" | "time" | "distance" | "time_distance",
    defaultUnit: "mi" | "km" | "m" | null,
  ) => {
    const parts: string[] = [];
    const numericWeight = Number(set.weight);
    const numericReps = Number(set.reps);

    if (measurementType === "reps") {
      if (numericWeight > 0 || numericReps > 0) {
        parts.push(`${set.weight}${set.weightUnit} × ${set.reps} reps`);
      }
    } else if (numericReps > 0) {
      parts.push(`${set.reps} reps`);
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

    return `Set ${index + 1} · ${parts.join(" · ") || "No data"}`;
  };

  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [dayName, setDayName] = useState(initialDayName);
  const [sessionNotes, setSessionNotes] = useState(initialNotes ?? "");

  const [selectedExerciseId, setSelectedExerciseId] = useState(exerciseOptions[0]?.id ?? "");
  const [exerciseToDelete, setExerciseToDelete] = useState<{ id: string; name: string } | null>(null);
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>(
    Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.notes ?? ""])),
  );

  const [editableSets, setEditableSets] = useState<Record<string, EditableSet[]>>(() =>
    Object.fromEntries(
      exercises.map((exercise) => [
        exercise.id,
        exercise.sets.map((set) => ({
          id: set.id,
          source: set,
          weight: String(set.weight),
          reps: String(set.reps),
          durationSeconds: set.duration_seconds === null ? "" : String(set.duration_seconds),
          weightUnit: set.weight_unit ?? unitLabel,
        })),
      ]),
    ),
  );

  const handleCancel = () => {
    setIsEditing(false);
    setDayName(initialDayName);
    setSessionNotes(initialNotes ?? "");
    setExerciseNotes(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.notes ?? ""])));
    setEditableSets(
      Object.fromEntries(
        exercises.map((exercise) => [
          exercise.id,
          exercise.sets.map((set) => ({
            id: set.id,
            source: set,
            weight: String(set.weight),
            reps: String(set.reps),
            durationSeconds: set.duration_seconds === null ? "" : String(set.duration_seconds),
            weightUnit: set.weight_unit ?? unitLabel,
          })),
        ]),
      ),
    );
  };

  const handleSave = () => {
    startTransition(async () => {
      const metaResult = await updateLogMetaAction({
        logId,
        dayNameOverride: dayName,
        notes: sessionNotes,
      });

      if (!metaResult.ok) {
        toastActionResult(toast, metaResult, { success: "", error: "Unable to save log details." });
        return;
      }

      for (const exercise of exercises) {
        const notes = exerciseNotes[exercise.id] ?? "";
        const result = await updateLogExerciseNotesAction({
          logId,
          logExerciseId: exercise.id,
          notes,
        });

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

  const updateEditableSetField = (exerciseId: string, setId: string, field: keyof EditableSet, value: string) => {
    setEditableSets((current) => ({
      ...current,
      [exerciseId]: (current[exerciseId] ?? []).map((set) => (set.id === setId ? { ...set, [field]: value } : set)),
    }));
  };

  const handleSaveSet = (exerciseId: string, setId: string) => {
    const currentSet = (editableSets[exerciseId] ?? []).find((set) => set.id === setId);
    if (!currentSet) return;

    startTransition(async () => {
      const result = await updateLogExerciseSetAction({
        logId,
        logExerciseId: exerciseId,
        setId,
        weight: Number(currentSet.weight),
        reps: Number(currentSet.reps),
        durationSeconds: currentSet.durationSeconds.trim() ? Number(currentSet.durationSeconds) : null,
        weightUnit: currentSet.weightUnit,
      });

      toastActionResult(toast, result, { success: "Set updated.", error: "Unable to update set." });
      if (result.ok) router.refresh();
    });
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    startTransition(async () => {
      const result = await deleteLogExerciseSetAction({ logId, logExerciseId: exerciseId, setId });
      toastActionResult(toast, result, { success: "Set deleted.", error: "Unable to delete set." });
      if (result.ok) router.refresh();
    });
  };

  const handleAddSet = (exerciseId: string) => {
    startTransition(async () => {
      const result = await addLogExerciseSetAction({
        logId,
        logExerciseId: exerciseId,
        weight: 0,
        reps: 0,
        durationSeconds: null,
        weightUnit: unitLabel,
      });
      toastActionResult(toast, result, { success: "Set added.", error: "Unable to add set." });
      if (result.ok) router.refresh();
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
        <AppHeader
          title="Session Summary"
          subtitleLeft={isEditing ? <AppBadge tone="today">Editing</AppBadge> : undefined}
          action={isEditing ? (
            <div className="flex items-center gap-2">
              <SecondaryButton type="button" size="sm" onClick={handleCancel} disabled={isPending}>Cancel</SecondaryButton>
              <PrimaryButton type="button" size="sm" onClick={handleSave} disabled={isPending}>{isPending ? "Saving..." : "Save"}</PrimaryButton>
            </div>
          ) : (
            <GhostButton type="button" size="sm" onClick={() => setIsEditing(true)}>Edit</GhostButton>
          )}
        />

        {isEditing ? (
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
              Day Name
              <input
                value={dayName}
                onChange={(event) => setDayName(event.target.value)}
                className="mt-1 w-full rounded-md border border-white/15 bg-black/15 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
              Session Notes
              <textarea
                value={sessionNotes}
                onChange={(event) => setSessionNotes(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-white/15 bg-black/15 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <div className="space-y-2 rounded-lg border border-white/15 bg-black/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Add Exercise</p>
              <select
                value={selectedExerciseId}
                onChange={(event) => setSelectedExerciseId(event.target.value)}
                className="w-full rounded-md border border-white/15 bg-black/15 px-3 py-2 text-sm text-slate-100"
              >
                {exerciseOptions.map((option) => (<option key={option.id} value={option.id}>{option.name}</option>))}
              </select>
              <div className="flex justify-end">
                <SecondaryButton type="button" size="sm" onClick={handleAddExercise}>Add Exercise</SecondaryButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <AppRow leftTop="Day" rightTop={dayName || "—"} />
            {sessionNotes.trim() ? <AppRow leftTop="Notes" rightTop={sessionNotes} rightWrap /> : null}
          </div>
        )}
      </AppPanel>

      <div className="space-y-3">
        {exercises.map((exercise) => {
          const name = exerciseNameMap[exercise.exercise_id] ?? exercise.exercise_id;
          const notesValue = exerciseNotes[exercise.id] ?? "";
          const setsForExercise = editableSets[exercise.id] ?? [];

          return (
            <AppPanel key={exercise.id} className="space-y-3 p-3">
              <AppRow
                leftTop={name}
                rightTop={<AppBadge>{setsForExercise.length} sets</AppBadge>}
                leftBottom={isEditing ? "Editing enabled" : undefined}
              />

              <ul className="space-y-2 text-sm text-slate-300">
                {setsForExercise.map((set, index) => (
                  <li key={set.id}>
                    {isEditing ? (
                      <div className="space-y-2 rounded-lg border border-white/10 bg-black/10 p-2">
                        <p className="text-xs font-medium text-slate-400">Set {index + 1}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" min={0} value={set.weight} onChange={(event) => updateEditableSetField(exercise.id, set.id, "weight", event.target.value)} className="rounded-md border border-white/15 bg-black/10 px-2 py-1 text-sm text-slate-100" placeholder="Weight" />
                          <select value={set.weightUnit} onChange={(event) => updateEditableSetField(exercise.id, set.id, "weightUnit", event.target.value)} className="rounded-md border border-white/15 bg-black/10 px-2 py-1 text-sm text-slate-100">
                            <option value="lbs">lbs</option>
                            <option value="kg">kg</option>
                          </select>
                          <input type="number" min={0} value={set.reps} onChange={(event) => updateEditableSetField(exercise.id, set.id, "reps", event.target.value)} className="rounded-md border border-white/15 bg-black/10 px-2 py-1 text-sm text-slate-100" placeholder="Reps" />
                          <input type="number" min={0} value={set.durationSeconds} onChange={(event) => updateEditableSetField(exercise.id, set.id, "durationSeconds", event.target.value)} className="rounded-md border border-white/15 bg-black/10 px-2 py-1 text-sm text-slate-100" placeholder="Time (sec)" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <AppButton type="button" variant="secondary" size="sm" onClick={() => handleSaveSet(exercise.id, set.id)}>Save Set</AppButton>
                          <DestructiveButton type="button" size="sm" onClick={() => handleDeleteSet(exercise.id, set.id)}>Delete Set</DestructiveButton>
                        </div>
                      </div>
                    ) : (
                      <AppRow
                        density="compact"
                        leftTop={`Set ${index + 1}`}
                        leftBottom={formatSetSummary(set, index, exercise.measurement_type, exercise.default_unit)}
                      />
                    )}
                  </li>
                ))}
              </ul>

              {isEditing ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton type="button" size="sm" onClick={() => handleAddSet(exercise.id)}>+ Add Set</SecondaryButton>
                    <DestructiveButton type="button" size="sm" onClick={() => setExerciseToDelete({ id: exercise.id, name })}>Delete Exercise</DestructiveButton>
                  </div>
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
                </>
              ) : notesValue.trim() ? (
                <AppRow density="compact" leftTop="Notes" leftBottom={notesValue} />
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
    </>
  );
}
