import "server-only";
import { redirect } from "next/navigation";
import {
  type LoadingDiagnosticsCollector,
  startLoadingDiagnosticGate,
  type LoadingDiagnosticMetadata,
} from "@/lib/loading-diagnostics";
import { supabaseServer } from "@/lib/supabase/server";

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
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch((error) => {
    gate.error(error);
    throw error;
  });

  if (!user) {
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
