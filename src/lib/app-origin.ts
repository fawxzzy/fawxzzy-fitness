export const FITNESS_CANONICAL_ORIGIN = "https://fitness.fawxzzy.com";

function normalizeOrigin(candidate: string) {
  const url = new URL(candidate);
  return url.origin;
}

export function resolveCanonicalAppOrigin(
  env: Record<string, string | undefined> = process.env,
) {
  const candidates = [
    env.NEXT_PUBLIC_APP_URL,
    env.APP_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : null,
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : null,
    FITNESS_CANONICAL_ORIGIN,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return normalizeOrigin(candidate);
    } catch {
      continue;
    }
  }

  return FITNESS_CANONICAL_ORIGIN;
}
