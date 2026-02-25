import { SessionExerciseFocus } from "@/components/SessionExerciseFocus";
import { SessionBackButton } from "@/components/SessionBackButton";
import { SessionHeaderControls } from "@/components/SessionHeaderControls";
import { SessionAddExerciseForm } from "@/components/SessionAddExerciseForm";
import { ActionFeedbackToasts } from "@/components/ActionFeedbackToasts";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import { createCustomExerciseAction, deleteCustomExerciseAction, renameCustomExerciseAction } from "@/app/actions/exercises";
import type { DisplayTarget } from "@/lib/session-targets";
import {
  addExerciseAction,
  addSetAction,
  persistDurationAction,
  removeExerciseAction,
  deleteSetAction,
  saveSessionAction,
  syncQueuedSetLogsAction,
  toggleSkipAction,
} from "./actions";
import { getSessionPageData } from "./queries";

export const dynamic = "force-dynamic";

function formatDurationText(durationSeconds: number) {
  if (durationSeconds < 60) {
    return `${durationSeconds}s`;
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatGoalLine(target: DisplayTarget, weightUnit: string | null) {
  const parts: string[] = [];

  if (target.sets !== undefined) {
    parts.push(`${target.sets} sets`);
  }

  if (target.repsText) {
    if (parts.length > 0) {
      parts[parts.length - 1] = `${parts[parts.length - 1]} × ${target.repsText}`;
    } else {
      parts.push(target.repsText);
    }
  }

  if (target.weight !== undefined) {
    const resolvedWeightUnit = target.weightUnit ?? weightUnit;
    const unitSuffix = resolvedWeightUnit ? ` ${resolvedWeightUnit}` : "";
    parts.push(`@ ${target.weight}${unitSuffix}`);
  }

  if (target.durationSeconds !== undefined) {
    parts.push(`Time: ${formatDurationText(target.durationSeconds)}`);
  }

  if (parts.length === 0) {
    return null;
  }

  return `Goal: ${parts.join(" • ")}`;
}

function getGoalPrefill(target: DisplayTarget | undefined, fallbackWeightUnit: "lbs" | "kg"): {
  weight?: number;
  reps?: number;
  durationSeconds?: number;
  weightUnit?: "lbs" | "kg";
} | undefined {
  if (!target) {
    return undefined;
  }

  const prefill: { weight?: number; reps?: number; durationSeconds?: number; weightUnit?: "lbs" | "kg" } = {};

  if (target.weight !== undefined) {
    prefill.weight = target.weight;
    prefill.weightUnit = target.weightUnit ?? fallbackWeightUnit;
  }

  if (target.repsText) {
    const repsMatch = target.repsText.match(/\d+/);
    if (repsMatch) {
      prefill.reps = Number(repsMatch[0]);
    }
  }

  if (target.durationSeconds !== undefined) {
    prefill.durationSeconds = target.durationSeconds;
  }

  return Object.keys(prefill).length > 0 ? prefill : undefined;
}

type PageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    error?: string;
    exerciseId?: string;
  };
};

export default async function SessionPage({ params, searchParams }: PageProps) {
  const {
    sessionRow,
    routine,
    sessionExercises,
    setsByExercise,
    sessionTargets,
    exerciseOptions,
    exerciseNameMap,
    customExercises,
  } = await getSessionPageData(params.id);

  const unitLabel = routine?.weight_unit ?? "kg";

  return (
    <section className="space-y-4 pt-[max(env(safe-area-inset-top),0.5rem)]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{sessionRow.name || "Routine"}: {sessionRow.routine_day_name || (sessionRow.routine_day_index ? `Day ${sessionRow.routine_day_index}` : "Day")}</h1>
        <SessionBackButton />
      </div>

      {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}
      <ActionFeedbackToasts />

      <details className="rounded-md">
        <summary className="cursor-pointer list-none rounded-md bg-white px-4 py-3 text-sm font-semibold shadow-sm [&::-webkit-details-marker]:hidden">Add exercise</summary>
        <div className="mt-2 rounded-md bg-white p-3 shadow-sm">
        <div className="space-y-3">
          <SessionAddExerciseForm
            sessionId={params.id}
            exercises={exerciseOptions}
            initialSelectedId={searchParams?.exerciseId}
            addExerciseAction={addExerciseAction}
          />

          <form action={createCustomExerciseAction} className="space-y-2 border-t border-slate-200 pt-3">
            <input type="hidden" name="returnTo" value={`/session/${params.id}`} />
            <label className="text-sm font-semibold">+ Add custom exercise</label>
            <input name="name" required minLength={2} maxLength={80} placeholder="Exercise name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25" />
            <div className="grid grid-cols-2 gap-2">
              <input name="primaryMuscle" placeholder="Primary muscle (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input name="equipment" placeholder="Equipment (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <button type="submit" className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}>Save Custom Exercise</button>
          </form>

          {customExercises.length > 0 ? (
            <ul className="space-y-2 border-t border-slate-200 pt-3">
              {customExercises.map((exercise) => (
                <li key={exercise.id} className="rounded-md bg-slate-50 p-2">
                  <p className="text-xs font-semibold">{exercise.name}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <form action={renameCustomExerciseAction} className="flex gap-2">
                      <input type="hidden" name="returnTo" value={`/session/${params.id}`} />
                      <input type="hidden" name="exerciseId" value={exercise.id} />
                      <input name="name" defaultValue={exercise.name} minLength={2} maxLength={80} className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs" />
                      <button type="submit" className={`rounded-md border border-slate-300 px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}>Rename</button>
                    </form>
                    <form action={deleteCustomExerciseAction}>
                      <input type="hidden" name="returnTo" value={`/session/${params.id}`} />
                      <input type="hidden" name="exerciseId" value={exercise.id} />
                      <button type="submit" className={`w-full rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}>Delete</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      </details>

      <SessionHeaderControls sessionId={params.id} initialDurationSeconds={sessionRow.duration_seconds} saveSessionAction={saveSessionAction} persistDurationAction={persistDurationAction} />

      {sessionExercises.length > 0 ? (
        <SessionExerciseFocus
          sessionId={params.id}
          unitLabel={unitLabel}
          exercises={sessionExercises.map((exercise) => {
            const displayTarget = sessionTargets.get(exercise.exercise_id);
            return {
              id: exercise.id,
              name: exerciseNameMap.get(exercise.exercise_id) ?? exercise.exercise_id,
              isSkipped: exercise.is_skipped,
              goalText: displayTarget ? formatGoalLine(displayTarget, routine?.weight_unit ?? null) : null,
              prefill: getGoalPrefill(displayTarget, unitLabel),
              initialSets: setsByExercise.get(exercise.id) ?? [],
              loggedSetCount: (setsByExercise.get(exercise.id) ?? []).length,
            };
          })}
          addSetAction={addSetAction}
          syncQueuedSetLogsAction={syncQueuedSetLogsAction}
          toggleSkipAction={toggleSkipAction}
          removeExerciseAction={removeExerciseAction}
          deleteSetAction={deleteSetAction}
        />
      ) : null}

      {sessionExercises.length === 0 ? <p className="rounded-md bg-white p-3 text-sm text-slate-500 shadow-sm">No exercises in this session yet.</p> : null}

    </section>
  );
}
