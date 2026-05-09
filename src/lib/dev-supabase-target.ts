export const FITNESS_EXPECTED_SUPABASE_HOST = "lpswxoyfniocuhljgzbc.supabase.co";

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

export function getSupabaseTargetDiagnostic() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const host = resolveSupabaseHost(rawUrl);

  return {
    expectedHost: FITNESS_EXPECTED_SUPABASE_HOST,
    host,
    rawUrl,
    matchesExpected: host === FITNESS_EXPECTED_SUPABASE_HOST,
  };
}
