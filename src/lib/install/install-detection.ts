export type InstallPlatform = "ios-safari" | "ios-webkit" | "chromium" | "unsupported";

export type InstallCapability = "native-prompt" | "manual" | "unsupported";

export type ManualInstallInstructions = {
  ctaLabel: string;
  platformLabel: string;
  steps: string[];
  helperText: string;
};

export type InstallPrimaryAction =
  | {
    kind: "install";
    label: "Install";
  }
  | {
    kind: "show-steps";
    label: "Show Steps";
  }
  | {
    kind: "open-safari";
    label: "Open Safari";
  }
  | {
    kind: "continue-browser";
    label: "Continue in browser";
  };

export type InstallSnapshot = {
  isStandalone: boolean;
  platform: InstallPlatform;
  capability: InstallCapability;
  manualInstructions: ManualInstallInstructions | null;
};

type NavigatorLike = Navigator & {
  standalone?: boolean;
};

type WindowLike = {
  matchMedia?: (query: string) => MediaQueryList | { matches: boolean };
  navigator?: NavigatorLike;
};

function normalizeUserAgent(userAgent: string) {
  return userAgent.toLowerCase();
}

function isIos(userAgent: string) {
  return /(iphone|ipad|ipod)/.test(userAgent);
}

function isSafari(userAgent: string) {
  return /safari/.test(userAgent) && !/(crios|fxios|edgios|opr|mercury)/.test(userAgent);
}

function isChromiumBrowser(userAgent: string) {
  return /(chrome|chromium|edg|opr|brave)/.test(userAgent) && !/android.*wv/.test(userAgent);
}

export function getStandaloneState(winLike?: WindowLike) {
  const resolvedWindow =
    winLike
    ?? (typeof window !== "undefined"
      ? (window as WindowLike)
      : undefined);

  if (!resolvedWindow) {
    return false;
  }

  const mediaMatch = resolvedWindow.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const navigatorStandalone = Boolean(resolvedWindow.navigator?.standalone);

  return mediaMatch || navigatorStandalone;
}

export function getInstallPlatform(userAgent: string): InstallPlatform {
  const normalizedUserAgent = normalizeUserAgent(userAgent);

  if (isIos(normalizedUserAgent)) {
    return isSafari(normalizedUserAgent) ? "ios-safari" : "ios-webkit";
  }

  if (isChromiumBrowser(normalizedUserAgent)) {
    return "chromium";
  }

  return "unsupported";
}

export function getManualInstallInstructions(platform: InstallPlatform): ManualInstallInstructions | null {
  if (platform === "ios-safari") {
    return {
      ctaLabel: "Show Steps",
      platformLabel: "iPhone or iPad",
      steps: [
        "Tap Share in Safari.",
        "Choose Add to Home Screen.",
        "Open FawxzzyFitness from the new home-screen icon.",
      ],
      helperText: "Safari is the iPhone and iPad browser that can add this app to the Home Screen.",
    };
  }

  if (platform === "ios-webkit") {
    return {
      ctaLabel: "Open Safari",
      platformLabel: "iPhone or iPad",
      steps: [
        "Open this page in Safari from your browser or in-app menu.",
        "In Safari, tap Share, then choose Add to Home Screen.",
        "Launch FawxzzyFitness from the new home-screen icon.",
      ],
      helperText: "iPhone and iPad home-screen install only works through Safari.",
    };
  }

  return null;
}

export function resolveInstallPrimaryAction({
  isStandalone,
  manualInstructions,
  nativePromptAvailable,
  platform,
}: {
  isStandalone: boolean;
  manualInstructions: ManualInstallInstructions | null;
  nativePromptAvailable: boolean;
  platform: InstallPlatform;
}): InstallPrimaryAction | null {
  if (isStandalone) {
    return null;
  }

  if (nativePromptAvailable) {
    return {
      kind: "install",
      label: "Install",
    };
  }

  if (platform === "ios-safari" && manualInstructions) {
    return {
      kind: "show-steps",
      label: "Show Steps",
    };
  }

  if (platform === "ios-webkit" && manualInstructions) {
    return {
      kind: "open-safari",
      label: "Open Safari",
    };
  }

  return {
    kind: "continue-browser",
    label: "Continue in browser",
  };
}

export function getInstallSnapshot({
  userAgent,
  isStandalone,
}: {
  userAgent: string;
  isStandalone: boolean;
}): InstallSnapshot {
  const platform = getInstallPlatform(userAgent);

  if (isStandalone) {
    return {
      isStandalone,
      platform,
      capability: "unsupported",
      manualInstructions: null,
    };
  }

  const manualInstructions = getManualInstallInstructions(platform);

  return {
    isStandalone,
    platform,
    capability: platform === "chromium" ? "native-prompt" : manualInstructions ? "manual" : "unsupported",
    manualInstructions,
  };
}
