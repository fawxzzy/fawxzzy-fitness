import type { AmbientPreset } from "@/lib/ambient/tuning";

const LOCAL_CHROME_PATH_PREFIX = "/dev/mobile-regression";

export function resolveAmbientPresetForPathname(pathname: string | null): AmbientPreset | null {
  if (!pathname || pathname === "/" || pathname.startsWith("/entry")) {
    return null;
  }

  if (pathname.startsWith(LOCAL_CHROME_PATH_PREFIX)) {
    return null;
  }

  if (
    pathname.startsWith("/login")
    || pathname.startsWith("/signup")
    || pathname.startsWith("/forgot-password")
    || pathname.startsWith("/reset-password")
    || pathname.startsWith("/auth")
    || pathname.startsWith("/curated-onboarding")
  ) {
    return null;
  }

  if (pathname.startsWith("/today")) {
    return "today";
  }

  if (pathname.startsWith("/history")) {
    return "history";
  }

  if (pathname.startsWith("/settings")) {
    return "modal";
  }

  if (pathname.startsWith("/session/")) {
    return "logSet";
  }

  if (pathname.startsWith("/routines/") && pathname.includes("/edit/day/")) {
    return pathname.includes("/add-exercise") ? "logSet" : "editDay";
  }

  if (pathname.startsWith("/routines")) {
    return "viewDay";
  }

  return null;
}

export function shouldRenderLocalAppChrome(pathname: string | null) {
  return Boolean(pathname?.startsWith(LOCAL_CHROME_PATH_PREFIX));
}
