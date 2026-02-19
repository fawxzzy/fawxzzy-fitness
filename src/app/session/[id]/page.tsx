import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
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

async function addSetAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const sessionExerciseId = String(formData.get("sessionExerciseId") ?? "");
  const weight = Number(formData.get("weight"));
  const reps = Number(formData.get("reps"));
  const durationValue = String(formData.get("durationSeconds") ?? "").trim();
  const durationSeconds = durationValue ? Number(durationValue) : null;

  if (!sessionId || !sessionExerciseId) {
    redirect(`/session/${sessionId}?error=${encodeURIComponent("Missing session info")}`);
  }

  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight < 0 || reps < 0) {
    redirect(`/session/${sessionId}?error=${encodeURIComponent("Weight and reps must be 0 or greater")}`);
  }

  if (durationSeconds !== null && (!Number.isInteger(durationSeconds) || durationSeconds < 0)) {
    redirect(`/session/${sessionId}?error=${encodeURIComponent("Time must be an integer in seconds")}`);
  }

  const { count } = await supabase
    .from("sets")
    .select("id", { head: true, count: "exact" })
    .eq("session_exercise_id", sessionExerciseId)
    .eq("user_id", user.id);

  const nextSetIndex = count ?? 0;

  const { error } = await supabase.from("sets").insert({
    session_exercise_id: sessionExerciseId,
    user_id: user.id,
    set_index: nextSetIndex,
    weight,
    reps,
    duration_seconds: durationSeconds,
    is_warmup: false,
  });

  if (error) {
    redirect(`/session/${sessionId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/session/${sessionId}`);
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

export default async function SessionPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    notFound();
  }

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
        .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds")
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

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{sessionRow.name || "Session"}</h1>
      <p className="rounded-md bg-white p-3 text-sm shadow-sm">
        {sessionRow.routine_day_name || (sessionRow.routine_day_index ? `Day ${sessionRow.routine_day_index}` : "Day")}
        {" · "}
        {new Date(sessionRow.performed_at).toLocaleString()}
      </p>

      {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}

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
        {sessionExercises.map((exercise, index) => {
          const exerciseSets = setsByExercise.get(exercise.id) ?? [];

          return (
            <article key={exercise.id} className="space-y-2 rounded-md bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{index + 1}. {getExerciseName(exercise.exercise_id)}</p>
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

              <form action={addSetAction} className="grid grid-cols-3 gap-2">
                <input type="hidden" name="sessionId" value={params.id} />
                <input type="hidden" name="sessionExerciseId" value={exercise.id} />
                <input type="number" name="weight" min={0} step="0.5" required placeholder="Weight" className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
                <input type="number" name="reps" min={0} required placeholder="Reps" className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
                <input type="number" name="durationSeconds" min={0} placeholder="Time (sec)" className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
                <button type="submit" className="col-span-3 rounded-md bg-slate-900 px-3 py-2 text-sm text-white">Log Set</button>
              </form>

              <ul className="space-y-1 text-sm">
                {exerciseSets.map((set) => (
                  <li key={set.id} className="rounded-md bg-slate-50 px-2 py-1">
                    #{set.set_index + 1} · {set.weight} kg × {set.reps}
                    {set.duration_seconds !== null ? ` · ${set.duration_seconds}s` : ""}
                  </li>
                ))}
                {exerciseSets.length === 0 ? <li className="text-slate-500">No sets logged.</li> : null}
              </ul>
            </article>
          );
        })}
      </div>

      {sessionExercises.length === 0 ? <p className="rounded-md bg-white p-3 text-sm text-slate-500 shadow-sm">No exercises in this session yet.</p> : null}

      <AppNav />
    </section>
  );
}
