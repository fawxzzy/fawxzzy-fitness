import test from "node:test";
import assert from "node:assert/strict";

import {
  getInstallPlatform,
  getInstallSnapshot,
  getManualInstallInstructions,
  getStandaloneState,
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
