const FALLBACK_APP_URL = "https://fawxzzy-fitness-local.vercel.app";

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}
export function getCanonicalAppUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    FALLBACK_APP_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return normalizeUrl(new URL(candidate).toString());
    } catch {
      continue;
    }
  }

  return FALLBACK_APP_URL;
}

export function getCanonicalInstallUrl() {
  return `${getCanonicalAppUrl()}/install`;
}
