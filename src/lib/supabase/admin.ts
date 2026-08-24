import "server-only";

import { SUPABASE_URL } from "@/lib/env";
import { createFitnessSupabaseClient } from "@/lib/supabase/schema";

const MODERN_ADMIN_CREDENTIAL_ENV = "SUPABASE_SECRET_KEY";
const LEGACY_ADMIN_CREDENTIAL_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const MISSING_ADMIN_CREDENTIAL_ERROR =
  "Supabase admin credential is not configured. Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.";

function normalizeAdminCredential(value: string | undefined): string | null {
  const normalized = value
    ?.replace(/^\uFEFF+/, "")
    .replace(/(?:\\r|\\n)+$/g, "")
    .trim();

  return normalized && normalized.length > 0 ? normalized : null;
}

function readAdminCredential(
  env: object,
  name: typeof MODERN_ADMIN_CREDENTIAL_ENV | typeof LEGACY_ADMIN_CREDENTIAL_ENV,
): string | undefined {
  const value = Reflect.get(env, name);
  return typeof value === "string" ? value : undefined;
}

function selectSupabaseAdminCredential(
  env: object,
): string | null {
  const modernCredential = normalizeAdminCredential(
    readAdminCredential(env, MODERN_ADMIN_CREDENTIAL_ENV),
  );
  if (modernCredential) {
    return modernCredential;
  }

  const legacyCredential = normalizeAdminCredential(
    readAdminCredential(env, LEGACY_ADMIN_CREDENTIAL_ENV),
  );
  if (legacyCredential) {
    return legacyCredential;
  }

  return null;
}

export function resolveSupabaseAdminCredential(
  env: object = process.env,
): string {
  const credential = selectSupabaseAdminCredential(env);
  if (credential) {
    return credential;
  }

  throw new Error(MISSING_ADMIN_CREDENTIAL_ERROR);
}

export function hasSupabaseAdminCredential(
  env: object = process.env,
): boolean {
  return selectSupabaseAdminCredential(env) !== null;
}

let adminClient: ReturnType<typeof createFitnessSupabaseClient> | null = null;

export function supabaseAdmin() {
  if (!adminClient) {
    adminClient = createFitnessSupabaseClient(SUPABASE_URL(), resolveSupabaseAdminCredential(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
