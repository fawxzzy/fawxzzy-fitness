import { redirect } from "next/navigation";
import { AuthenticatedRememberedLoginSync } from "@/components/auth/AuthenticatedRememberedLoginSync";
import { InitialExperienceGate } from "@/components/auth/InitialExperienceGate";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { requireUser } from "@/lib/auth";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { recordServerBootDiagnostic } from "@/lib/boot-diagnostics";
import { isCuratedOnboardingEnabled } from "@/lib/feature-flags";
import { resolveLocalDevAutoEntryHref } from "@/lib/local-dev-auto-entry";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { ensureProfileForEntryBootstrap } from "@/lib/profile";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function recordEntryBootDiagnostic(stage: string, level: "error" | "info" | "warn", error?: unknown) {
  const normalizedError = error instanceof Error
    ? {
        errorName: error.name,
        errorMessage: error.message,
      }
    : {
        errorMessage: typeof error === "string" ? error : null,
      };

  return recordServerBootDiagnostic({
    tag: "[boot.entry]",
    source: "server",
    route: "/entry",
    stage,
    buildId: CURRENT_APP_BUILD_ID,
    ...normalizedError,
  }, level);
}

export default async function EntryPage() {
  const diagnostics = new LoadingDiagnosticsCollector("/entry");
  const user = await requireUser({
    gate: "entry.auth.session",
    route: "/entry",
    blockingReason: "Waiting for authenticated session before resolving entry handoff.",
    timeoutMs: 5000,
    collector: diagnostics,
  });
  const supabase = supabaseServer();

  const localDevAutoEntryHref = await resolveLocalDevAutoEntryHref({
    supabase,
    userEmail: user.email ?? null,
    userId: user.id,
  });
  if (localDevAutoEntryHref) {
    redirect(localDevAutoEntryHref);
  }

  let hasExistingProgram = true;
  try {
    await diagnostics.measure("entry.profile.bootstrap", () => ensureProfileForEntryBootstrap(user.id), {
      blockingReason: "Waiting for entry profile bootstrap.",
      timeoutMs: 5000,
    });
  } catch (error) {
    recordEntryBootDiagnostic("profile-bootstrap", "warn", error);
  }

  try {
    hasExistingProgram = await diagnostics.measure("entry.routine-hint.fetch", async () => {
      const { count, error } = await supabase
        .from("routines")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      return error ? true : (count ?? 0) > 0;
    }, {
      blockingReason: "Checking whether entry should treat this member as having an existing program.",
      timeoutMs: 5000,
    });
  } catch (error) {
    recordEntryBootDiagnostic("routine-hint.fetch", "warn", error);
    hasExistingProgram = true;
  }

  const rememberedLoginDisplayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.username === "string"
        ? user.user_metadata.username
        : null;

  let curatedEngineEnabled = false;
  try {
    curatedEngineEnabled = isCuratedOnboardingEnabled();
  } catch (error) {
    recordEntryBootDiagnostic("feature-flags", "warn", error);
  }

  let diagnosticEntries = diagnostics.snapshot();
  try {
    diagnosticEntries = diagnostics.snapshot();
  } catch (error) {
    recordEntryBootDiagnostic("diagnostics.snapshot", "warn", error);
    diagnosticEntries = [];
  }

  try {
    return (
      <>
        <LoadingDiagnosticsClientBridge entries={diagnosticEntries} />
        <AuthenticatedRememberedLoginSync email={user.email ?? null} displayName={rememberedLoginDisplayName} />
        <InitialExperienceGate
          userId={user.id}
          hasExistingProgram={hasExistingProgram}
          curatedEngineEnabled={curatedEngineEnabled}
        />
      </>
    );
  } catch (error) {
    recordServerBootDiagnostic({
      tag: "[entry.boot.unexpected]",
      source: "server",
      route: "/entry",
      stage: "render",
      buildId: CURRENT_APP_BUILD_ID,
      errorName: error instanceof Error ? error.name : null,
      errorMessage: error instanceof Error ? error.message : typeof error === "string" ? error : null,
    }, "error");
    throw error;
  }
}
