import "server-only";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { createSupabaseServerClient, readCurrentRequestServerSessionTokens, recoverCurrentRequestServerSession } from "@/lib/auth/server-session";
import { recordServerBootDiagnostic } from "@/lib/boot-diagnostics";

export function supabaseServer() {
  const { accessToken } = readCurrentRequestServerSessionTokens();
  return createSupabaseServerClient(accessToken);
}

export async function supabaseServerWithSession() {
  const { recovery, session } = await recoverCurrentRequestServerSession();

  if (recovery.status === "anonymous") {
    return createSupabaseServerClient(session.accessToken);
  }
  if (recovery.status === "existing") {
    return createSupabaseServerClient(recovery.session.accessToken);
  }

  if (recovery.status === "refreshed") {
    recordServerBootDiagnostic({
      tag: "[boot.auth]",
      source: "server",
      route: null,
      stage: `restore-session-${recovery.authState}`,
      buildId: CURRENT_APP_BUILD_ID,
      authState: recovery.authState,
    });
    return createSupabaseServerClient(recovery.session.accessToken);
  }

  recordServerBootDiagnostic({
    tag: "[boot.auth]",
    source: "server",
    route: null,
    stage: `restore-session-${recovery.status === "failed" ? recovery.failure.reason : recovery.status}`,
    buildId: CURRENT_APP_BUILD_ID,
    authState: recovery.status === "failed" ? "auth-error" : null,
    errorName: recovery.status === "unexpected-error" && recovery.error instanceof Error ? recovery.error.name : null,
    errorMessage:
      recovery.status === "unexpected-error" && recovery.error instanceof Error
        ? recovery.error.message
        : null,
  }, "error");
  return createSupabaseServerClient(session.accessToken);
}
