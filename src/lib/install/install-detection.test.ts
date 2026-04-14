import test from "node:test";
import assert from "node:assert/strict";

import {
  areInstallSnapshotsEqual,
  getBrowserInstallSnapshot,
  getInstallPlatform,
  getInstallSnapshot,
  getManualInstallInstructions,
  getRuntimeInstallSnapshot,
  INSTALL_BOOTSTRAP_TIMEOUT_MS,
  resolveInstallBootstrapSnapshot,
  resolveInstallBootstrapTimeoutStatus,
  getStandaloneState,
  resolveInstallPrimaryAction,
} from "./install-detection.ts";

test("getStandaloneState honors display-mode and navigator.standalone", () => {
  assert.equal(
    getStandaloneState({
      matchMedia: () => ({ matches: true }),
      navigator: {},
    }),
    true,
  );

  assert.equal(
    getStandaloneState({
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: true } as Navigator & { standalone?: boolean },
    }),
    true,
  );

  assert.equal(
    getStandaloneState({
      matchMedia: () => ({ matches: false }),
      navigator: {},
    }),
    false,
  );
});

test("getInstallPlatform distinguishes iOS Safari, iOS non-Safari, and Chromium", () => {
  assert.equal(
    getInstallPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1"),
    "ios-safari",
  );

  assert.equal(
    getInstallPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 CriOS/124.0.0.0 Mobile/15E148 Safari/604.1"),
    "ios-webkit",
  );

  assert.equal(
    getInstallPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"),
    "chromium",
  );
});

test("getManualInstallInstructions is only present for iOS manual-install flows", () => {
  assert.equal(getManualInstallInstructions("chromium"), null);
  assert.equal(getManualInstallInstructions("unsupported"), null);
  assert.equal(Boolean(getManualInstallInstructions("ios-safari")), true);
  assert.equal(Boolean(getManualInstallInstructions("ios-webkit")), true);
});

test("getInstallSnapshot reports native prompt, manual install, and unsupported browser states", () => {
  assert.deepEqual(
    getInstallSnapshot({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      isStandalone: false,
    }).capability,
    "native-prompt",
  );

  assert.deepEqual(
    getInstallSnapshot({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1",
      isStandalone: false,
    }).capability,
    "manual",
  );

  assert.deepEqual(
    getInstallSnapshot({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
      isStandalone: false,
    }).capability,
    "unsupported",
  );
});

test("getRuntimeInstallSnapshot resolves browser and standalone states without waiting on prompt availability", () => {
  assert.deepEqual(
    resolveInstallBootstrapSnapshot({
      matchMedia: () => ({ matches: false }),
      navigator: {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      } as Navigator,
    }),
    {
      status: "browser",
      snapshot: getBrowserInstallSnapshot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"),
    },
  );

  const standaloneSnapshot = getRuntimeInstallSnapshot({
    matchMedia: () => ({ matches: true }),
    navigator: {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1",
    } as Navigator,
  });

  assert.equal(standaloneSnapshot.isStandalone, true);
  assert.equal(resolveInstallBootstrapSnapshot({
    matchMedia: () => ({ matches: true }),
    navigator: {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1",
    } as Navigator,
  }).status, "standalone");
});

test("resolveInstallBootstrapTimeoutStatus forces checking to fail open into browser mode quickly", () => {
  assert.equal(resolveInstallBootstrapTimeoutStatus("checking"), "browser");
  assert.equal(resolveInstallBootstrapTimeoutStatus("standalone"), "standalone");
  assert.equal(resolveInstallBootstrapTimeoutStatus("browser"), "browser");
  assert.equal(resolveInstallBootstrapTimeoutStatus("error"), "error");
  assert.equal(INSTALL_BOOTSTRAP_TIMEOUT_MS >= 400 && INSTALL_BOOTSTRAP_TIMEOUT_MS <= 800, true);
});

test("resolveInstallPrimaryAction only returns Install when a real prompt is ready", () => {
  assert.deepEqual(
    resolveInstallPrimaryAction({
      isStandalone: false,
      manualInstructions: null,
      nativePromptAvailable: true,
      platform: "chromium",
    }),
    {
      kind: "install",
      label: "Install",
    },
  );

  assert.deepEqual(
    resolveInstallPrimaryAction({
      isStandalone: false,
      manualInstructions: null,
      nativePromptAvailable: false,
      platform: "chromium",
    }),
    {
      kind: "continue-browser",
      label: "Continue in browser",
    },
  );
});

test("resolveInstallPrimaryAction upgrades Chromium browser mode when the prompt arrives later", () => {
  const chromiumSnapshot = getBrowserInstallSnapshot(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
  );

  assert.equal(chromiumSnapshot.capability, "native-prompt");

  assert.deepEqual(
    resolveInstallPrimaryAction({
      isStandalone: chromiumSnapshot.isStandalone,
      manualInstructions: chromiumSnapshot.manualInstructions,
      nativePromptAvailable: false,
      platform: chromiumSnapshot.platform,
    }),
    {
      kind: "continue-browser",
      label: "Continue in browser",
    },
  );

  assert.deepEqual(
    resolveInstallPrimaryAction({
      isStandalone: chromiumSnapshot.isStandalone,
      manualInstructions: chromiumSnapshot.manualInstructions,
      nativePromptAvailable: true,
      platform: chromiumSnapshot.platform,
    }),
    {
      kind: "install",
      label: "Install",
    },
  );
});

test("resolveInstallPrimaryAction routes iOS Safari and iOS webviews to real manual flows", () => {
  assert.deepEqual(
    resolveInstallPrimaryAction({
      isStandalone: false,
      manualInstructions: getManualInstallInstructions("ios-safari"),
      nativePromptAvailable: false,
      platform: "ios-safari",
    }),
    {
      kind: "show-steps",
      label: "Show Steps",
    },
  );

  assert.deepEqual(
    resolveInstallPrimaryAction({
      isStandalone: false,
      manualInstructions: getManualInstallInstructions("ios-webkit"),
      nativePromptAvailable: false,
      platform: "ios-webkit",
    }),
    {
      kind: "open-safari",
      label: "Open Safari",
    },
  );
});

test("resolveInstallPrimaryAction bypasses the gate in standalone mode", () => {
  assert.equal(
    resolveInstallPrimaryAction({
      isStandalone: true,
      manualInstructions: getManualInstallInstructions("ios-safari"),
      nativePromptAvailable: true,
      platform: "ios-safari",
    }),
    null,
  );
});

test("areInstallSnapshotsEqual only changes when the actual gate contract changes", () => {
  const chromiumSnapshot = getBrowserInstallSnapshot(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
  );

  assert.equal(areInstallSnapshotsEqual(chromiumSnapshot, getBrowserInstallSnapshot(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
  )), true);
  assert.equal(areInstallSnapshotsEqual(chromiumSnapshot, getInstallSnapshot({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1",
    isStandalone: false,
  })), false);
});
