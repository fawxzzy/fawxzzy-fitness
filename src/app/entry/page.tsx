import { InitialExperienceGate } from "@/components/auth/InitialExperienceGate";
import { requireUser } from "@/lib/auth";
import { isCuratedOnboardingEnabled } from "@/lib/feature-flags";
import { ensureProfile } from "@/lib/profile";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EntryPage() {
  const user = await requireUser();
  await ensureProfile(user.id);

  let hasExistingProgram = true;

  try {
    const supabase = supabaseServer();
    const { count, error } = await supabase
      .from("routines")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    hasExistingProgram = error ? true : (count ?? 0) > 0;
  } catch {
    hasExistingProgram = true;
  }

  return (
    <InitialExperienceGate
      userId={user.id}
      hasExistingProgram={hasExistingProgram}
      curatedEngineEnabled={isCuratedOnboardingEnabled()}
    />
  );
}
