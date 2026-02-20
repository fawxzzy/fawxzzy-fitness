import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { SessionExerciseFocus } from "@/components/SessionExerciseFocus";
import { SessionHeaderControls } from "@/components/SessionHeaderControls";
import { ExercisePicker } from "@/components/ExercisePicker";
import { createCustomExerciseAction, deleteCustomExerciseAction, renameCustomExerciseAction } from "@/app/actions/exercises";
import { requireUser } from "@/lib/auth";
import { listExercises } from "@/lib/exercises";
import { getSessionTargets, type DisplayTarget } from "@/lib/session-targets";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionExerciseRow, SessionRow, SetRow } from "@/types/db";

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
    const unitSuffix = weightUnit ? ` ${weightUnit}` : "";
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

type PageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    error?: string;
    success?: string;
    exerciseId?: string;
  };
};

async function addSetAction(payload: {
  sessionId: string;
  sessionExerciseId: string;
  weight: number;
  reps: number;
  durationSeconds: number | null;
  isWarmup: boolean;
  rpe: number | null;
  notes: string | null;
}) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const { sessionId, sessionExerciseId, weight, reps, durationSeconds, isWarmup, rpe, notes } = payload;

  if (!sessionId || !sessionExerciseId) {
    return { ok: false, error: "Missing session info" };
  }

  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight < 0 || reps < 0) {
    return { ok: false, error: "Weight and reps must be 0 or greater" };
  }

  if (durationSeconds !== null && (!Number.isInteger(durationSeconds) || durationSeconds < 0)) {
    return { ok: false, error: "Time must be an integer in seconds" };
  }

  const { count } = await supabase
    .from("sets")
    .select("id", { head: true, count: "exact" })
    .eq("session_exercise_id", sessionExerciseId)
    .eq("user_id", user.id);

  const nextSetIndex = count ?? 0;

  const { data: insertedSet, error } = await supabase
    .from("sets")
    .insert({
      session_exercise_id: sessionExerciseId,
      user_id: user.id,
      set_index: nextSetIndex,
      weight,
      reps,
      duration_seconds: durationSeconds,
      is_warmup: isWarmup,
      rpe,
      notes,
    })
    .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, rpe")
    .single();

  if (error || !insertedSet) {
    return { ok: false, error: error?.message ?? "Could not log set" };
  }

  return { ok: true, set: insertedSet as SetRow };
}

async function toggleSkipAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const sessionExerciseId = String(formData.get("sessionExerciseId") ?? "");
  const nextSkipped = formData.get("nextSkipped") === "true";

  if (!sessionId || !sessionExerciseId) {
    redirect(`/session/${sessionId}?error=${encodeURIComponent("Missing skip info")}`);
  }

  const { error } = await supabase
    .from("session_exercises")
    .update({ is_skipped: nextSkipped })
    .eq("id", sessionExerciseId)
    .eq("user_id", user.id)
    .eq("session_id", sessionId);

  if (error) {
    redirect(`/session/${sessionId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/session/${sessionId}`);
}

async function addExerciseAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const exerciseId = String(formData.get("exerciseId") ?? "");

  if (!sessionId || !exerciseId) {
    redirect(`/session/${sessionId}?error=${encodeURIComponent("Missing exercise info")}`);
  }

  const { count } = await supabase
    .from("session_exercises")
    .select("id", { head: true, count: "exact" })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  const { error } = await supabase.from("session_exercises").insert({
    session_id: sessionId,
    user_id: user.id,
    exercise_id: exerciseId,
    position: count ?? 0,
    is_skipped: false,
  });

  if (error) {
    redirect(`/session/${sessionId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/session/${sessionId}`);
}

async function removeExerciseAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const sessionExerciseId = String(formData.get("sessionExerciseId") ?? "");

  if (!sessionId || !sessionExerciseId) {
    redirect(`/session/${sessionId}?error=${encodeURIComponent("Missing remove info")}`);
  }

  const { error } = await supabase
    .from("session_exercises")
    .delete()
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/session/${sessionId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/session/${sessionId}`);
}

async function persistDurationAction(payload: { sessionId: string; durationSeconds: number }) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  if (!payload.sessionId || !Number.isInteger(payload.durationSeconds) || payload.durationSeconds < 0) {
    return { ok: false };
  }

  const { error } = await supabase
    .from("sessions")
    .update({ duration_seconds: payload.durationSeconds })
    .eq("id", payload.sessionId)
    .eq("user_id", user.id)
    .eq("status", "in_progress");

  if (error) {
    return { ok: false };
  }

  return { ok: true };
}

async function saveSessionAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const durationValue = String(formData.get("durationSeconds") ?? "").trim();
  const durationSeconds = durationValue ? Number(durationValue) : null;

  if (!sessionId) {
    redirect(`/today?error=${encodeURIComponent("Missing session info")}`);
  }

  if (durationSeconds !== null && (!Number.isInteger(durationSeconds) || durationSeconds < 0)) {
    redirect(`/session/${sessionId}?error=${encodeURIComponent("Session time must be an integer in seconds")}`);
  }

  const { error } = await supabase
    .from("sessions")
    .update({ duration_seconds: durationSeconds, status: "completed" })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/session/${sessionId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/today");
  revalidatePath("/history");
  redirect("/today?completed=1");
}

export default async function SessionPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, duration_seconds, status")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    notFound();
  }

  const { data: routine } = session.routine_id
    ? await supabase.from("routines").select("weight_unit").eq("id", session.routine_id).eq("user_id", user.id).maybeSingle()
    : { data: null };

  const { data: sessionExercisesData } = await supabase
    .from("session_exercises")
    .select("id, session_id, user_id, exercise_id, position, notes, is_skipped")
    .eq("session_id", params.id)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const sessionExercises = (sessionExercisesData ?? []) as SessionExerciseRow[];
  const exerciseIds = sessionExercises.map((exercise) => exercise.id);

  const { data: setsData } = exerciseIds.length
    ? await supabase
        .from("sets")
        .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, rpe")
        .in("session_exercise_id", exerciseIds)
        .eq("user_id", user.id)
        .order("set_index", { ascending: true })
    : { data: [] };

  const sets = (setsData ?? []) as SetRow[];
  const setsByExercise = new Map<string, SetRow[]>();

  for (const set of sets) {
    const current = setsByExercise.get(set.session_exercise_id) ?? [];
    current.push(set);
    setsByExercise.set(set.session_exercise_id, current);
  }

  const sessionRow = session as SessionRow;
  const unitLabel = routine?.weight_unit ?? "kg";
  const sessionTargets = await getSessionTargets(params.id);
  const exerciseOptions = await listExercises();
  const exerciseNameMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.name]));
  const customExercises = exerciseOptions.filter((exercise) => !exercise.is_global && exercise.user_id === user.id);

  return (
    <section className="space-y-4">
      {sessionRow.status === "in_progress" ? <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">In progress</p> : null}
      <h1 className="text-2xl font-semibold">{sessionRow.name || "Routine"}: {sessionRow.routine_day_name || (sessionRow.routine_day_index ? `Day ${sessionRow.routine_day_index}` : "Day")}</h1>
      <p className="rounded-md bg-white p-3 text-sm shadow-sm">{new Date(sessionRow.performed_at).toLocaleString()}</p>

      {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}
      {searchParams?.success ? <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{searchParams.success}</p> : null}

      <SessionHeaderControls sessionId={params.id} initialDurationSeconds={sessionRow.duration_seconds} saveSessionAction={saveSessionAction} persistDurationAction={persistDurationAction} />

      <details className="rounded-md" open>
        <summary className="cursor-pointer list-none rounded-md bg-white px-4 py-3 text-sm font-semibold shadow-sm [&::-webkit-details-marker]:hidden">Add exercise</summary>
        <div className="mt-2 rounded-md bg-white p-3 shadow-sm">
        <div className="space-y-3">
          <form action={addExerciseAction} className="space-y-2">
            <input type="hidden" name="sessionId" value={params.id} />
            <ExercisePicker exercises={exerciseOptions} name="exerciseId" initialSelectedId={searchParams?.exerciseId} />
            <button type="submit" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">Add</button>
          </form>

          <form action={createCustomExerciseAction} className="space-y-2 border-t border-slate-200 pt-3">
            <input type="hidden" name="returnTo" value={`/session/${params.id}`} />
            <label className="text-sm font-semibold">+ Add custom exercise</label>
            <input name="name" required minLength={2} maxLength={80} placeholder="Exercise name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input name="primaryMuscle" placeholder="Primary muscle (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input name="equipment" placeholder="Equipment (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">Save Custom Exercise</button>
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
                      <button type="submit" className="rounded-md border border-slate-300 px-2 py-1 text-xs">Rename</button>
                    </form>
                    <form action={deleteCustomExerciseAction}>
                      <input type="hidden" name="returnTo" value={`/session/${params.id}`} />
                      <input type="hidden" name="exerciseId" value={exercise.id} />
                      <button type="submit" className="w-full rounded-md border border-red-300 px-2 py-1 text-xs text-red-700">Delete</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      </details>

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
              initialSets: setsByExercise.get(exercise.id) ?? [],
              loggedSetCount: (setsByExercise.get(exercise.id) ?? []).length,
            };
          })}
          addSetAction={addSetAction}
          toggleSkipAction={toggleSkipAction}
          removeExerciseAction={removeExerciseAction}
        />
      ) : null}

      {sessionExercises.length === 0 ? <p className="rounded-md bg-white p-3 text-sm text-slate-500 shadow-sm">No exercises in this session yet.</p> : null}

      <AppNav />
    </section>
  );
}
