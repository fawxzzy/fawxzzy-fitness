import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACCESS_COOKIE_NAME,
  buildSessionRecoveryPath,
  classifyAuthSessionFailure,
  hasSessionCookieValues,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth-session";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { recordServerBootDiagnostic } from "@/lib/boot-diagnostics";
import {
  type LoadingDiagnosticsCollector,
  startLoadingDiagnosticGate,
  type LoadingDiagnosticMetadata,
} from "@/lib/loading-diagnostics";
import { supabaseServerWithSession } from "@/lib/supabase/server";

type RequireUserOptions = {
  gate?: string;
  route?: string;
  blockingReason?: string;
  metadata?: LoadingDiagnosticMetadata;
  timeoutMs?: number;
  collector?: LoadingDiagnosticsCollector | null;
};

export async function requireUser(options: RequireUserOptions = {}) {
  const gate = startLoadingDiagnosticGate({
    gate: options.gate ?? "auth.require-user",
    route: options.route ?? null,
    source: "server",
    blockingReason: options.blockingReason ?? "Waiting for authenticated Supabase session.",
    metadata: options.metadata,
    timeoutMs: options.timeoutMs ?? 5000,
    collector: options.collector,
  });
  const supabase = await supabaseServerWithSession();
  const cookieStore = cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value ?? null;
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value ?? null;
  const hasSessionCookies = hasSessionCookieValues({ accessToken, refreshToken });
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] | null = null;

  try {
    const result = await supabase.auth.getUser();
    const failure = classifyAuthSessionFailure(result.error);

    if (failure) {
      recordServerBootDiagnostic({
        tag: "[boot.auth]",
        source: "server",
        route: options.route ?? null,
        stage: `redirect-login-${failure.reason}`,
        buildId: CURRENT_APP_BUILD_ID,
        authState: hasSessionCookies ? "redirected-login" : "auth-error",
      }, "warn");
      gate.redirect({
        blockingReason: "Recovered from an invalid or expired authenticated session by redirecting to /login.",
      });
      redirect(buildSessionRecoveryPath(failure.loginErrorCode));
    }

    user = result.data.user;
  } catch (error) {
    gate.error(error);
    const failure = classifyAuthSessionFailure(error);

    if (!failure) {
      throw error;
    }

    recordServerBootDiagnostic({
      tag: "[boot.auth]",
      source: "server",
      route: options.route ?? null,
      stage: `redirect-login-${failure.reason}`,
      buildId: CURRENT_APP_BUILD_ID,
      authState: hasSessionCookies ? "redirected-login" : "auth-error",
      errorName: error instanceof Error ? error.name : null,
      errorMessage: error instanceof Error ? error.message : typeof error === "string" ? error : null,
    }, "warn");
    gate.redirect({
      blockingReason: "Recovered from an invalid or expired authenticated session by redirecting to /login.",
    });
    redirect(buildSessionRecoveryPath(failure.loginErrorCode));
  }

  if (!user) {
    if (hasSessionCookies) {
      recordServerBootDiagnostic({
        tag: "[boot.auth]",
        source: "server",
        route: options.route ?? null,
        stage: "redirect-login-user-missing-after-session-check",
        buildId: CURRENT_APP_BUILD_ID,
        authState: "redirected-login",
      }, "warn");
      gate.redirect({
        blockingReason: "Session cookies were present without an authenticated user. Redirecting to /login.",
      });
      redirect(buildSessionRecoveryPath());
    }

    gate.redirect({
      blockingReason: "No authenticated user session. Redirecting to /login.",
    });
    redirect("/login");
  }

  gate.resolve({
    metadata: {
      userId: user.id,
    },
  });
  return user;
}
