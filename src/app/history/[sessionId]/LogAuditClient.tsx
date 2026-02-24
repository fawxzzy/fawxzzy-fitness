"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { Glass } from "@/components/ui/Glass";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import { toastActionResult } from "@/lib/action-feedback";
import {
  addLogExerciseSetAction,
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
  weight_unit: "lbs" | "kg" | null;
};


type EditableSet = {
  id: string;
  weight: string;
  reps: string;
  durationSeconds: string;
  weightUnit: "lbs" | "kg";
};

type AuditExercise = {
  id: string;
  exercise_id: string;
  notes: string | null;
  sets: AuditSet[];
};

export function LogAuditClient({
  logId,
  initialDayName,
  initialNotes,
  unitLabel,
  exerciseNameMap,
  exercises,
}: {
  logId: string;
  initialDayName: string;
  initialNotes: string | null;
  unitLabel: "lbs" | "kg";
  exerciseNameMap: Record<string, string>;
  exercises: AuditExercise[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [dayName, setDayName] = useState(initialDayName);
  const [sessionNotes, setSessionNotes] = useState(initialNotes ?? "");
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>(
    Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.notes ?? ""])),
  );

  const [editableSets, setEditableSets] = useState<Record<string, EditableSet[]>>(() =>
    Object.fromEntries(
      exercises.map((exercise) => [
        exercise.id,
        exercise.sets.map((set) => ({
          id: set.id,
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
    if (!currentSet) {
      return;
    }

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
      if (result.ok) {
        router.refresh();
      }
    });
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    startTransition(async () => {
      const result = await deleteLogExerciseSetAction({ logId, logExerciseId: exerciseId, setId });
      toastActionResult(toast, result, { success: "Set deleted.", error: "Unable to delete set." });
      if (result.ok) {
        router.refresh();
      }
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
      if (result.ok) {
        router.refresh();
      }
    });
  };

  return (
    <>
      <Glass variant="base" className="p-4" interactive={false}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Session Summary</h2>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleCancel} disabled={isPending} className={`rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium ${tapFeedbackClass}`}>
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={isPending} className={`rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white ${tapFeedbackClass}`}>
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setIsEditing(true)} className={`rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium ${tapFeedbackClass}`}>
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-600">
              Day Name
              <input value={dayName} onChange={(event) => setDayName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm font-medium text-slate-600">
              Session Notes
              <textarea value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
          </div>
        ) : (
          <dl className="space-y-2 text-sm text-slate-700">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Day Name</dt>
              <dd>{dayName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Session Notes</dt>
              <dd>{sessionNotes || "—"}</dd>
            </div>
          </dl>
        )}
      </Glass>

      <div className="space-y-3">
        {exercises.map((exercise) => {
          const name = exerciseNameMap[exercise.exercise_id] ?? exercise.exercise_id;
          const setCount = exercise.sets.length;
          const notesValue = exerciseNotes[exercise.id] ?? "";

          return (
            <Glass key={exercise.id} variant="base" className="p-4" interactive={false}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">{name}</h3>
                <span className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600">{setCount} sets</span>
              </div>

              <ul className="mb-3 space-y-1 text-sm text-slate-700">
                {(editableSets[exercise.id] ?? []).map((set, index) => (
                  <li key={set.id} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-600">Set {index + 1}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" min={0} value={set.weight} onChange={(event) => updateEditableSetField(exercise.id, set.id, "weight", event.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="Weight" />
                          <select value={set.weightUnit} onChange={(event) => updateEditableSetField(exercise.id, set.id, "weightUnit", event.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
                            <option value="lbs">lbs</option>
                            <option value="kg">kg</option>
                          </select>
                          <input type="number" min={0} value={set.reps} onChange={(event) => updateEditableSetField(exercise.id, set.id, "reps", event.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="Reps" />
                          <input type="number" min={0} value={set.durationSeconds} onChange={(event) => updateEditableSetField(exercise.id, set.id, "durationSeconds", event.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="Time (sec)" />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleSaveSet(exercise.id, set.id)} className={`rounded-md border border-slate-300 px-2 py-1 text-xs ${tapFeedbackClass}`}>Save Set</button>
                          <button type="button" onClick={() => handleDeleteSet(exercise.id, set.id)} className={`rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 ${tapFeedbackClass}`}>Delete Set</button>
                        </div>
                      </div>
                    ) : (
                      <span>
                        Set {index + 1}: {set.weight}
                        {set.weightUnit} × {set.reps} reps
                        {set.durationSeconds ? ` · ${set.durationSeconds} sec` : ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {isEditing ? (
                <button type="button" onClick={() => handleAddSet(exercise.id)} className={`mb-3 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium ${tapFeedbackClass}`}>
                  + Add Set
                </button>
              ) : null}

              {isEditing ? (
                <label className="block text-sm font-medium text-slate-600">
                  Exercise Notes
                  <textarea
                    value={notesValue}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setExerciseNotes((current) => ({ ...current, [exercise.id]: nextValue }));
                    }}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              ) : (
                <p className="text-sm text-slate-600">Notes: {notesValue || "—"}</p>
              )}
            </Glass>
          );
        })}
      </div>
    </>
  );
}
