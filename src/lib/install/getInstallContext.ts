export type InstallPlatform = "ios" | "android" | "desktop" | "unknown";
export type InstallBrowserKind = "safari" | "chrome" | "edge" | "firefox" | "inApp" | "unknown";
export type InstallContextOverride =
  | "ios-inapp"
  | "ios-safari"
  | "ios-standalone"
  | "android"
  | "android-chrome"
  | "desktop"
  | "desktop-windows-edge"
  | "desktop-windows-chrome"
  | "desktop-macos-safari"
  | "desktop-macos-chrome";

export type InstallContext = {
  platform: InstallPlatform;
  browserKind: InstallBrowserKind;
  isIOS: boolean;
  isAndroid: boolean;
  isInAppBrowser: boolean;
  isSafari: boolean;
  isStandalone: boolean;
  isBrowserTab: boolean;
  canUseNativeInstallPrompt: boolean;
  shouldShowIOSOpenInSafariGate: boolean;
  shouldShowIOSAddToHomeScreenGate: boolean;
  shouldBlockAppAccess: boolean;
  shouldAllowAppAccess: boolean;
};

export type InstallContextOptions = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  canUseNativeInstallPrompt?: boolean;
  override?: string | null;
  allowOverride?: boolean;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const IN_APP_BROWSER_PATTERN =
  /(TikTok|musical_ly|Instagram|FBAN|FBAV|Messenger|Twitter|Line|LinkedInApp|Pinterest|Snapchat|Discord|WhatsApp|Telegram|MicroMessenger)/i;
const SAFARI_EXCLUSION_PATTERN = /(CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|YaBrowser)/i;

function resolveStandaloneFromWindow() {
  if (typeof window === "undefined") {
    return false;
  }

  const displayStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const displayFullscreen = window.matchMedia?.("(display-mode: fullscreen)").matches ?? false;
  const navigatorStandalone = Boolean((window.navigator as NavigatorWithStandalone).standalone);

  return displayStandalone || displayFullscreen || navigatorStandalone;
}
function detectIOS(userAgent: string, platform: string, maxTouchPoints: number) {
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

function detectAndroid(userAgent: string) {
  return /Android/i.test(userAgent);
}

function parseOverride(rawOverride: string | null | undefined, allowOverride: boolean): InstallContextOverride | null {
  if (!allowOverride || !rawOverride) {
    return null;
  }

  if (
    rawOverride === "ios-inapp"
    || rawOverride === "ios-safari"
    || rawOverride === "ios-standalone"
    || rawOverride === "android"
    || rawOverride === "android-chrome"
    || rawOverride === "desktop"
    || rawOverride === "desktop-windows-edge"
    || rawOverride === "desktop-windows-chrome"
    || rawOverride === "desktop-macos-safari"
    || rawOverride === "desktop-macos-chrome"
  ) {
    return rawOverride;
  }

  return null;
}

function contextFromOverride(
  override: InstallContextOverride,
  canUseNativeInstallPrompt: boolean,
): InstallContext {
  if (override === "ios-inapp") {
    return {
      platform: "ios",
      browserKind: "inApp",
      isIOS: true,
      isAndroid: false,
      isInAppBrowser: true,
      isSafari: false,
      isStandalone: false,
      isBrowserTab: true,
      canUseNativeInstallPrompt,
      shouldShowIOSOpenInSafariGate: true,
      shouldShowIOSAddToHomeScreenGate: false,
      shouldBlockAppAccess: true,
      shouldAllowAppAccess: false,
    };
  }

  if (override === "ios-safari") {
    return {
      platform: "ios",
      browserKind: "safari",
      isIOS: true,
      isAndroid: false,
      isInAppBrowser: false,
      isSafari: true,
      isStandalone: false,
      isBrowserTab: true,
      canUseNativeInstallPrompt,
      shouldShowIOSOpenInSafariGate: false,
      shouldShowIOSAddToHomeScreenGate: true,
      shouldBlockAppAccess: false,
      shouldAllowAppAccess: true,
    };
  }

  if (override === "ios-standalone") {
    return {
      platform: "ios",
      browserKind: "safari",
      isIOS: true,
      isAndroid: false,
      isInAppBrowser: false,
      isSafari: true,
      isStandalone: true,
      isBrowserTab: false,
      canUseNativeInstallPrompt: false,
      shouldShowIOSOpenInSafariGate: false,
      shouldShowIOSAddToHomeScreenGate: false,
      shouldBlockAppAccess: false,
      shouldAllowAppAccess: true,
    };
  }

  if (override === "android" || override === "android-chrome") {
    return {
      platform: "android",
      browserKind: "chrome",
      isIOS: false,
      isAndroid: true,
      isInAppBrowser: false,
      isSafari: false,
      isStandalone: false,
      isBrowserTab: true,
      canUseNativeInstallPrompt,
      shouldShowIOSOpenInSafariGate: false,
      shouldShowIOSAddToHomeScreenGate: false,
      shouldBlockAppAccess: false,
      shouldAllowAppAccess: true,
    };
  }

  return {
    platform: "desktop",
    browserKind: override === "desktop-windows-edge"
      ? "edge"
      : override === "desktop-macos-safari"
        ? "safari"
        : "chrome",
    isIOS: false,
    isAndroid: false,
    isInAppBrowser: false,
    isSafari: false,
    isStandalone: false,
    isBrowserTab: true,
    canUseNativeInstallPrompt,
    shouldShowIOSOpenInSafariGate: false,
    shouldShowIOSAddToHomeScreenGate: false,
    shouldBlockAppAccess: false,
    shouldAllowAppAccess: true,
  };
}

export async function copyInstallUrl(url: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is unavailable in this environment.");
  }

  const input = document.createElement("textarea");
  input.value = url;
  input.setAttribute("readonly", "");
  input.style.position = "absolute";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

export function getInstallContext(options: InstallContextOptions = {}): InstallContext {
  const userAgent = options.userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  const platform = options.platform ?? (typeof navigator === "undefined" ? "" : navigator.platform);
  const maxTouchPoints = options.maxTouchPoints ?? (typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints ?? 0);
  const canUseNativeInstallPrompt = options.canUseNativeInstallPrompt ?? false;
  const override = parseOverride(options.override, options.allowOverride ?? false);

  if (override) {
    return contextFromOverride(override, canUseNativeInstallPrompt);
  }

  const isIOS = detectIOS(userAgent, platform, maxTouchPoints);
  const isAndroid = detectAndroid(userAgent);
  const isInAppBrowser = IN_APP_BROWSER_PATTERN.test(userAgent);
  const isSafari = isIOS && /Safari/i.test(userAgent) && !SAFARI_EXCLUSION_PATTERN.test(userAgent) && !isInAppBrowser;
  const isStandalone = options.standalone ?? resolveStandaloneFromWindow();

  let browserKind: InstallBrowserKind = "unknown";

  if (isInAppBrowser) {
    browserKind = "inApp";
  } else if (/EdgA|EdgiOS|Edg/i.test(userAgent)) {
    browserKind = "edge";
  } else if (/FxiOS|Firefox/i.test(userAgent)) {
    browserKind = "firefox";
  } else if (/CriOS|Chrome/i.test(userAgent)) {
    browserKind = "chrome";
  } else if (isSafari) {
    browserKind = "safari";
  }

  const shouldShowIOSOpenInSafariGate = isIOS && isInAppBrowser && !isStandalone;
  const shouldShowIOSAddToHomeScreenGate = isIOS && !isInAppBrowser && isSafari && !isStandalone;
  const shouldBlockAppAccess = shouldShowIOSOpenInSafariGate;

  return {
    platform: isIOS ? "ios" : isAndroid ? "android" : userAgent ? "desktop" : "unknown",
    browserKind,
    isIOS,
    isAndroid,
    isInAppBrowser,
    isSafari,
    isStandalone,
    isBrowserTab: !isStandalone,
    canUseNativeInstallPrompt,
    shouldShowIOSOpenInSafariGate,
    shouldShowIOSAddToHomeScreenGate,
    shouldBlockAppAccess,
    shouldAllowAppAccess: !shouldBlockAppAccess,
  };
}
