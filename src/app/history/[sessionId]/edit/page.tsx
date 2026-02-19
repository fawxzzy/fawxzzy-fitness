import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getExerciseName } from "@/lib/exercise-options";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionExerciseRow, SessionRow, SetRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { sessionId: string };
};

async function updateSessionMetaAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const sessionId = String(formData.get("sessionId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!sessionId) {
    throw new Error("Missing session id");
  }

  const { error } = await supabase.from("sessions").update({ name: name || null }).eq("id", sessionId).eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/history/${sessionId}/edit`);
  revalidatePath("/history");
}

async function updateSessionExerciseAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const sessionId = String(formData.get("sessionId") ?? "");
  const sessionExerciseId = String(formData.get("sessionExerciseId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const isSkipped = formData.get("isSkipped") === "on";

  if (!sessionId || !sessionExerciseId) {
    throw new Error("Missing exercise data");
  }

  const { error } = await supabase
    .from("session_exercises")
    .update({ notes: notes || null, is_skipped: isSkipped })
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/history/${sessionId}/edit`);
  revalidatePath("/history");
}

async function updateSetAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const sessionId = String(formData.get("sessionId") ?? "");
  const setId = String(formData.get("setId") ?? "");
  const weight = Number(formData.get("weight"));
  const reps = Number(formData.get("reps"));
  const rpeValue = String(formData.get("rpe") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!sessionId || !setId || !Number.isFinite(weight) || !Number.isFinite(reps)) {
    throw new Error("Invalid set data");
  }

  const rpe = rpeValue ? Number(rpeValue) : null;

  if (rpe !== null && !Number.isFinite(rpe)) {
    throw new Error("RPE must be numeric");
  }

  const { error } = await supabase
    .from("sets")
    .update({ weight, reps, rpe, notes: notes || null })
    .eq("id", setId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/history/${sessionId}/edit`);
  revalidatePath("/history");
}

async function deleteSessionAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    throw new Error("Missing session id");
  }

  const { error } = await supabase.from("sessions").delete().eq("id", sessionId).eq("user_id", user.id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/history");
  redirect("/history");
}

export default async function EditHistorySessionPage({ params }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, duration_seconds")
    .eq("id", params.sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    notFound();
  }

  const { data: sessionExercisesData } = await supabase
    .from("session_exercises")
    .select("id, session_id, user_id, exercise_id, position, notes, is_skipped")
    .eq("session_id", params.sessionId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const sessionExercises = (sessionExercisesData ?? []) as SessionExerciseRow[];
  const sessionExerciseIds = sessionExercises.map((row) => row.id);

  const { data: setsData } = sessionExerciseIds.length
    ? await supabase
        .from("sets")
        .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, rpe")
        .in("session_exercise_id", sessionExerciseIds)
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit History</h1>
        <Link href="/history" className="text-sm underline">Back</Link>
      </div>

      <p className="rounded-md bg-white p-3 text-sm shadow-sm">{sessionRow.name || "Session"} · {sessionRow.routine_day_name || "Day"}</p>

      <form action={updateSessionMetaAction} className="space-y-2 rounded-md bg-white p-3 shadow-sm">
        <input type="hidden" name="sessionId" value={sessionRow.id} />
        <label className="block text-sm">Session Name
          <input name="name" defaultValue={sessionRow.name ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <button type="submit" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">Save Session Name</button>
      </form>

      {sessionExercises.map((exercise) => (
        <article key={exercise.id} className="space-y-2 rounded-md bg-white p-3 shadow-sm">
          <p className="font-semibold">{getExerciseName(exercise.exercise_id)}</p>
          <form action={updateSessionExerciseAction} className="space-y-2">
            <input type="hidden" name="sessionId" value={sessionRow.id} />
            <input type="hidden" name="sessionExerciseId" value={exercise.id} />
            <label className="block text-sm">Exercise Notes
              <textarea name="notes" defaultValue={exercise.notes ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isSkipped" defaultChecked={exercise.is_skipped} />Skipped</label>
            <button type="submit" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">Save Exercise</button>
          </form>

          <ul className="space-y-2">
            {(setsByExercise.get(exercise.id) ?? []).map((set) => (
              <li key={set.id} className="rounded-md bg-slate-50 p-2">
                <form action={updateSetAction} className="space-y-2">
                  <input type="hidden" name="sessionId" value={sessionRow.id} />
                  <input type="hidden" name="setId" value={set.id} />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" name="weight" step="0.5" min={0} defaultValue={set.weight} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
                    <input type="number" name="reps" min={0} defaultValue={set.reps} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
                    <input type="number" name="rpe" step="0.5" min={0} max={10} defaultValue={set.rpe ?? ""} placeholder="RPE" className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
                  </div>
                  <input name="notes" defaultValue={set.notes ?? ""} placeholder="Set notes" className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" />
                  <button type="submit" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">Save Set #{set.set_index + 1}</button>
                </form>
              </li>
            ))}
          </ul>
        </article>
      ))}

      <form action={deleteSessionAction}>
        <input type="hidden" name="sessionId" value={sessionRow.id} />
        <button type="submit" className="w-full rounded-md border border-red-300 px-3 py-2 text-sm text-red-700">Delete Session</button>
      </form>
    </section>
  );
}
