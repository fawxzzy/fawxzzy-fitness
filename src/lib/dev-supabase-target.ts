export const FITNESS_DEFAULT_EXPECTED_SUPABASE_HOST = "lpswxoyfniocuhljgzbc.supabase.co";

export const FITNESS_EXPECT_SUPABASE_HOST_ENV = "FITNESS_EXPECT_SUPABASE_HOST";

export function resolveSupabaseHost(rawUrl: string | null | undefined) {
  if (!rawUrl) {
    return null;
  }

  try {
    return new URL(rawUrl).host.toLowerCase();
  } catch {
    return null;
  }
}

export function resolveExpectedSupabaseHost(rawHost: string | null | undefined) {
  const normalized = rawHost?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return FITNESS_DEFAULT_EXPECTED_SUPABASE_HOST;
  }

  if (normalized.includes("://")) {
    return resolveSupabaseHost(normalized) ?? FITNESS_DEFAULT_EXPECTED_SUPABASE_HOST;
  }

  try {
    return new URL(`http://${normalized}`).host.toLowerCase();
  } catch {
    return FITNESS_DEFAULT_EXPECTED_SUPABASE_HOST;
  }
}

export function getSupabaseTargetDiagnostic() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const host = resolveSupabaseHost(rawUrl);
  const expectedHost = resolveExpectedSupabaseHost(
    process.env[FITNESS_EXPECT_SUPABASE_HOST_ENV] ?? null,
  );

  return {
    expectedHost,
    host,
    rawUrl,
    matchesExpected: host === expectedHost,
  };
}
