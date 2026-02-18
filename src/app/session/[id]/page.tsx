import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SetRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

async function addSetAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = createServerSupabase();

  const sessionId = String(formData.get("sessionId") ?? "");
  const sessionExerciseId = String(formData.get("sessionExerciseId") ?? "");
  const weight = Number(formData.get("weight"));
  const reps = Number(formData.get("reps"));
  const isWarmup = formData.get("isWarmup") === "on";

  if (!sessionId || !sessionExerciseId) {
    throw new Error("Missing session info");
  }

  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight < 0 || reps < 0) {
    throw new Error("Weight and reps must be 0 or greater.");
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
    is_warmup: isWarmup,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/session/${sessionId}`);
}

export default async function SessionPage({ params }: PageProps) {
  const user = await requireUser();
  const supabase = createServerSupabase();

  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    notFound();
  }

  const { data: sessionExercise } = await supabase
    .from("session_exercises")
    .select("id")
    .eq("session_id", params.id)
    .eq("user_id", user.id)
    .order("position", { ascending: true })
    .limit(1)
    .single();

  if (!sessionExercise) {
    notFound();
  }

  const { data: setsData } = await supabase
    .from("sets")
    .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes")
    .eq("session_exercise_id", sessionExercise.id)
    .eq("user_id", user.id)
    .order("set_index", { ascending: true });

  const sets = (setsData ?? []) as SetRow[];

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Session</h1>
      <p className="rounded-md bg-white p-3 text-sm shadow-sm">Session ID: {params.id}</p>

      <form action={addSetAction} className="space-y-3 rounded-md bg-white p-4 shadow-sm">
        <input type="hidden" name="sessionId" value={params.id} />
        <input type="hidden" name="sessionExerciseId" value={sessionExercise.id} />

        <div>
          <label className="mb-1 block text-sm">Weight</label>
          <input
            type="number"
            name="weight"
            min={0}
            step="0.5"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm">Reps</label>
          <input
            type="number"
            name="reps"
            min={0}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isWarmup" />
          Warmup set
        </label>

        <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-white">
          Save Set
        </button>
      </form>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Logged Sets</h2>
        <ul className="space-y-2">
          {sets.map((set) => (
            <li key={set.id} className="rounded-md bg-white p-3 text-sm shadow-sm">
              #{set.set_index + 1} · {set.weight} kg × {set.reps} reps
              {set.is_warmup ? " · warmup" : ""}
            </li>
          ))}
          {sets.length === 0 ? (
            <li className="rounded-md bg-white p-3 text-sm text-slate-500 shadow-sm">
              No sets logged yet.
            </li>
          ) : null}
        </ul>
      </section>

      <AppNav />
    </section>
  );
}
