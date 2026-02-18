import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PLACEHOLDER_EXERCISE_ID = "11111111-1111-1111-1111-111111111111";

async function startSessionAction() {
  "use server";

  const user = await requireUser();
  const supabase = createServerSupabase();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({ user_id: user.id })
    .select("id")
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? "Could not create session");
  }

  const { error: exerciseError } = await supabase.from("session_exercises").insert({
    session_id: session.id,
    user_id: user.id,
    exercise_id: PLACEHOLDER_EXERCISE_ID,
    position: 0,
  });

  if (exerciseError) {
    throw new Error(exerciseError.message);
  }

  redirect(`/session/${session.id}`);
}

export default async function TodayPage() {
  await requireUser();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Today</h1>
      <p className="text-sm text-slate-600">Start a new training session.</p>
      <form action={startSessionAction}>
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 px-4 py-5 text-lg font-semibold text-white"
        >
          Start Session
        </button>
      </form>
      <AppNav />
    </section>
  );
}
