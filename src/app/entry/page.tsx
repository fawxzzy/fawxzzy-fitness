import { AuthenticatedRememberedLoginSync } from "@/components/auth/AuthenticatedRememberedLoginSync";
import { InitialExperienceGate } from "@/components/auth/InitialExperienceGate";
import { requireUser } from "@/lib/auth";
import { isCuratedOnboardingEnabled } from "@/lib/feature-flags";
import { ensureProfileForEntryBootstrap } from "@/lib/profile";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EntryPage() {
  const user = await requireUser();
  await ensureProfileForEntryBootstrap(user.id);
  const rememberedLoginDisplayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.username === "string"
        ? user.user_metadata.username
        : null;

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
    <>
      <AuthenticatedRememberedLoginSync email={user.email ?? null} displayName={rememberedLoginDisplayName} />
      <InitialExperienceGate
        userId={user.id}
        hasExistingProgram={hasExistingProgram}
        curatedEngineEnabled={isCuratedOnboardingEnabled()}
      />
    </>
  );
}
