import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { SessionHeaderControls } from "@/components/SessionHeaderControls";
import { SetLoggerCard } from "@/components/SessionTimers";
import { requireUser } from "@/lib/auth";
import { EXERCISE_OPTIONS, getExerciseName } from "@/lib/exercise-options";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionExerciseRow, SessionRow, SetRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    error?: string;
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

  return (
    <section className="space-y-4">
      {sessionRow.status === "in_progress" ? <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">In progress</p> : null}
      <h1 className="text-2xl font-semibold">{sessionRow.name || "Routine"}: {sessionRow.routine_day_name || (sessionRow.routine_day_index ? `Day ${sessionRow.routine_day_index}` : "Day")}</h1>
      <p className="rounded-md bg-white p-3 text-sm shadow-sm">{new Date(sessionRow.performed_at).toLocaleString()}</p>

      {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}

      <SessionHeaderControls sessionId={params.id} initialDurationSeconds={sessionRow.duration_seconds} saveSessionAction={saveSessionAction} />

      <form action={addExerciseAction} className="space-y-2 rounded-md bg-white p-3 shadow-sm">
        <input type="hidden" name="sessionId" value={params.id} />
        <label className="text-sm font-semibold">Add exercise</label>
        <select name="exerciseId" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          {EXERCISE_OPTIONS.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
          ))}
        </select>
        <button type="submit" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">Add</button>
      </form>

      <div className="space-y-3">
        {sessionExercises.map((exercise) => {
          const exerciseSets = setsByExercise.get(exercise.id) ?? [];

          return (
            <article key={exercise.id} className="space-y-2 rounded-md bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{getExerciseName(exercise.exercise_id)}</p>
                <div className="flex gap-2">
                  <form action={toggleSkipAction}>
                    <input type="hidden" name="sessionId" value={params.id} />
                    <input type="hidden" name="sessionExerciseId" value={exercise.id} />
                    <input type="hidden" name="nextSkipped" value={String(!exercise.is_skipped)} />
                    <button type="submit" className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                      {exercise.is_skipped ? "Unskip" : "Skip"}
                    </button>
                  </form>
                  <form action={removeExerciseAction}>
                    <input type="hidden" name="sessionId" value={params.id} />
                    <input type="hidden" name="sessionExerciseId" value={exercise.id} />
                    <button type="submit" className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700">Remove</button>
                  </form>
                </div>
              </div>

              {exercise.is_skipped ? <p className="text-sm text-amber-700">Marked skipped for this session.</p> : null}

              <SetLoggerCard
                sessionId={params.id}
                sessionExerciseId={exercise.id}
                addSetAction={addSetAction}
                unitLabel={unitLabel}
                initialSets={exerciseSets}
              />
            </article>
          );
        })}
      </div>

      {sessionExercises.length === 0 ? <p className="rounded-md bg-white p-3 text-sm text-slate-500 shadow-sm">No exercises in this session yet.</p> : null}

      <AppNav />
    </section>
  );
}
