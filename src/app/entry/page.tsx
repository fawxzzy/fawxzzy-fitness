import { AuthenticatedRememberedLoginSync } from "@/components/auth/AuthenticatedRememberedLoginSync";
import { InitialExperienceGate } from "@/components/auth/InitialExperienceGate";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { requireUser } from "@/lib/auth";
import { isCuratedOnboardingEnabled } from "@/lib/feature-flags";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { ensureProfileForEntryBootstrap } from "@/lib/profile";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EntryPage() {
  const diagnostics = new LoadingDiagnosticsCollector("/entry");
  const user = await requireUser({
    gate: "entry.auth.session",
    route: "/entry",
    blockingReason: "Waiting for authenticated session before resolving entry handoff.",
    timeoutMs: 5000,
    collector: diagnostics,
  });
  await diagnostics.measure("entry.profile.bootstrap", () => ensureProfileForEntryBootstrap(user.id), {
    blockingReason: "Waiting for entry profile bootstrap.",
    metadata: {
      userId: user.id,
    },
    timeoutMs: 5000,
  });
  const rememberedLoginDisplayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.username === "string"
        ? user.user_metadata.username
        : null;

  let hasExistingProgram = true;

  try {
    hasExistingProgram = await diagnostics.measure("entry.routine-hint.fetch", async () => {
      const supabase = supabaseServer();
      const { count, error } = await supabase
        .from("routines")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      return error ? true : (count ?? 0) > 0;
    }, {
      blockingReason: "Checking whether entry should treat this member as having an existing program.",
      metadata: {
        userId: user.id,
      },
      timeoutMs: 5000,
    });
  } catch {
    hasExistingProgram = true;
  }

  return (
    <>
      <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
      <AuthenticatedRememberedLoginSync email={user.email ?? null} displayName={rememberedLoginDisplayName} />
      <InitialExperienceGate
        userId={user.id}
        hasExistingProgram={hasExistingProgram}
        curatedEngineEnabled={isCuratedOnboardingEnabled()}
      />
    </>
  );
}
