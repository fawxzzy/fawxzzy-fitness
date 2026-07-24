import { CURRENT_APP_BUILD } from "@/lib/app-build";
import { optionalEnv } from "@/lib/env";
import { hasSupabaseAdminCredential } from "@/lib/supabase/admin";

export const ATLAS_REPO_ID = "fitness" as const;
export const ATLAS_APP_ID = "fawxzzy-fitness" as const;
export const ATLAS_HEALTH_CONTRACT_VERSION = "atlas.health.v1" as const;

export type AtlasEnvironment = "local" | "preview" | "production" | "ci" | "test";
export type AtlasHealthStatus = "ok" | "degraded" | "failing" | "unknown";
export type AtlasReceiptStatus = "accepted" | "rejected" | "passed" | "failed" | "skipped" | "warning";

export type AtlasHealthPayload = {
  readonly contract_version: typeof ATLAS_HEALTH_CONTRACT_VERSION;
  readonly repo_id: typeof ATLAS_REPO_ID;
  readonly app_id: typeof ATLAS_APP_ID;
  readonly checked_at: string;
  readonly status: AtlasHealthStatus;
  readonly environment: AtlasEnvironment;
  readonly version: string;
  readonly commit: string;
  readonly checks: readonly {
    readonly name: string;
    readonly status: AtlasHealthStatus;
    readonly summary: string;
    readonly latency_ms: number | null;
  }[];
  readonly receipts: readonly {
    readonly kind: string;
    readonly status: AtlasReceiptStatus;
    readonly ref: string;
  }[];
  readonly notes?: readonly string[];
};

function normalizeAtlasEnvironment(): AtlasEnvironment {
  if (process.env.NODE_ENV === "test") {
    return "test";
  }

  if (process.env.VERCEL_ENV === "production") {
    return "production";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "preview";
  }

  // An explicit Vercel target describes the deployed surface even inside CI.
  if (process.env.CI === "true") {
    return "ci";
  }

  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  if (process.env.CI === "true") {
    return "ci";
  }

  return "local";
}

function resolveCommitSha(): string {
  const candidates = [
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    CURRENT_APP_BUILD.buildId,
  ];

  for (const candidate of candidates) {
    const normalized = candidate?.trim() ?? "";
    if (/^[0-9a-f]{7,40}$/i.test(normalized)) {
      return normalized.toLowerCase();
    }
  }

  return "0000000";
}

function summarizeStatus(statuses: readonly AtlasHealthStatus[]): AtlasHealthStatus {
  if (statuses.includes("failing")) {
    return "failing";
  }

  if (statuses.includes("degraded")) {
    return "degraded";
  }

  if (statuses.includes("unknown")) {
    return "unknown";
  }

  return "ok";
}

export function buildAtlasHealthPayload(args?: {
  readonly checkedAt?: string;
}): AtlasHealthPayload {
  const environment = normalizeAtlasEnvironment();
  const publicSupabaseReady =
    Boolean(optionalEnv("NEXT_PUBLIC_SUPABASE_URL"))
    && Boolean(optionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const supabaseAdminReady = hasSupabaseAdminCredential();
  const appOriginReady = Boolean(
    optionalEnv("NEXT_PUBLIC_APP_URL")
    || optionalEnv("APP_URL")
    || process.env.VERCEL_URL?.trim()
    || process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim(),
  );

  const checks = [
    {
      name: "supabase-browser-env",
      status: publicSupabaseReady ? "ok" : "failing",
      summary: publicSupabaseReady
        ? "Public Supabase URL and anon key are configured."
        : "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      latency_ms: null,
    },
    {
      name: "supabase-admin-env",
      status: supabaseAdminReady ? "ok" : "degraded",
      summary: supabaseAdminReady
        ? "Supabase admin access is available for admin and recovery flows."
        : "A Supabase admin credential is missing, so admin-only auth helpers stay limited.",
      latency_ms: null,
    },
    {
      name: "app-origin-env",
      status: appOriginReady ? "ok" : "unknown",
      summary: appOriginReady
        ? "An application origin is configured for auth redirect flows."
        : "NEXT_PUBLIC_APP_URL or APP_URL is not configured in this runtime.",
      latency_ms: null,
    },
  ] as const;

  const notes =
    resolveCommitSha() === "0000000"
      ? ["Commit SHA was unavailable in this runtime, so the health payload used a local placeholder."]
      : undefined;

  return {
    contract_version: ATLAS_HEALTH_CONTRACT_VERSION,
    repo_id: ATLAS_REPO_ID,
    app_id: ATLAS_APP_ID,
    checked_at: args?.checkedAt ?? new Date().toISOString(),
    status: summarizeStatus(checks.map((check) => check.status)),
    environment,
    version: CURRENT_APP_BUILD.version,
    commit: resolveCommitSha(),
    checks,
    receipts: [],
    ...(notes ? { notes } : {}),
  };
}
