"use client";

import { getSafeReturnHref } from "@/components/ui/useBackNavigation";
import { SESSION_EXPIRED_LOGIN_ERROR } from "@/lib/auth-session";
import { isSafeAppPath } from "@/lib/navigation-return";

type SafeRecoveryProbeResult =
  | { ok: true; href: string }
  | { ok: false; reason: string };

function normalizeCandidateHref(value: string | null | undefined) {
  return isSafeAppPath(value) ? value : null;
}

function buildUniqueCandidates(
  currentPath: string | null | undefined,
  preferredHrefs: Array<string | null | undefined> = [],
) {
  const candidates = new Set<string>();
  const safeCurrentPath = normalizeCandidateHref(currentPath);
  const safeReturnHref = safeCurrentPath ? getSafeReturnHref(safeCurrentPath, "/today") : "/today";

  for (const candidate of [
    ...preferredHrefs,
    safeReturnHref,
    "/today",
    `/login?error=${encodeURIComponent(SESSION_EXPIRED_LOGIN_ERROR)}`,
  ]) {
    const normalized = normalizeCandidateHref(candidate);
    if (!normalized || normalized === safeCurrentPath) {
      continue;
    }
    candidates.add(normalized);
  }

  return [...candidates];
}

async function probeSafeRecoveryHref(candidateHref: string): Promise<SafeRecoveryProbeResult> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "window-unavailable" };
  }

  if (!isSafeAppPath(candidateHref)) {
    return { ok: false, reason: "invalid-candidate" };
  }

  try {
    const probeUrl = new URL(candidateHref, window.location.origin);
    const response = await fetch(probeUrl, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      redirect: "follow",
      headers: {
        "x-fitness-safe-navigation-probe": "1",
      },
    });

    if (!response.ok && !response.redirected) {
      return { ok: false, reason: `status-${response.status}` };
    }

    const finalUrl = new URL(response.url, window.location.origin);
    if (finalUrl.origin !== window.location.origin) {
      return { ok: false, reason: "cross-origin" };
    }

    const finalHref = `${finalUrl.pathname}${finalUrl.search}`;
    if (!isSafeAppPath(finalHref) || finalUrl.pathname.startsWith("/auth/session-recovery")) {
      return { ok: false, reason: "unsafe-final-destination" };
    }

    return { ok: true, href: finalHref };
  } catch {
    return { ok: false, reason: "probe-failed" };
  }
}

export async function navigateToFirstSafeRecoveryHref(options: {
  currentPath: string | null | undefined;
  preferredHrefs?: Array<string | null | undefined>;
  onNavigate?: (href: string) => void;
}) {
  const candidates = buildUniqueCandidates(options.currentPath, options.preferredHrefs);
  for (const candidate of candidates) {
    const probe = await probeSafeRecoveryHref(candidate);
    if (!probe.ok) {
      continue;
    }

    if (options.onNavigate) {
      options.onNavigate(probe.href);
    } else if (typeof window !== "undefined") {
      window.location.assign(probe.href);
    }

    return probe.href;
  }

  return null;
}
