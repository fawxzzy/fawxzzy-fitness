import test from "node:test";
import assert from "node:assert/strict";
import { getInstallContext } from "@/lib/install/getInstallContext";

test("detects iPhone Safari browser tab as Add to Home Screen gate", () => {
  const context = getInstallContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
    standalone: false,
  });

  assert.equal(context.isIOS, true);
  assert.equal(context.isSafari, true);
  assert.equal(context.shouldShowIOSAddToHomeScreenGate, true);
});
test("detects iPhone in-app browser as Open in Safari gate", () => {
  const context = getInstallContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 TikTok 37.1.0",
    platform: "iPhone",
    maxTouchPoints: 5,
    standalone: false,
  });

  assert.equal(context.isInAppBrowser, true);
  assert.equal(context.shouldShowIOSOpenInSafariGate, true);
});

test("allows iPhone standalone mode", () => {
  const context = getInstallContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
    standalone: true,
  });

  assert.equal(context.isStandalone, true);
  assert.equal(context.shouldAllowAppAccess, true);
});

test("detects Android install prompt support", () => {
  const context = getInstallContext({
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    maxTouchPoints: 5,
    standalone: false,
    canUseNativeInstallPrompt: true,
  });

  assert.equal(context.isAndroid, true);
  assert.equal(context.canUseNativeInstallPrompt, true);
  assert.equal(context.shouldAllowAppAccess, true);
});

test("detects desktop fallback without iOS gates", () => {
  const context = getInstallContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    platform: "Win32",
    maxTouchPoints: 0,
    standalone: false,
  });

  assert.equal(context.platform, "desktop");
  assert.equal(context.shouldAllowAppAccess, true);
});

test("detects iPadOS Safari desktop platform with touch", () => {
  const context = getInstallContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    platform: "MacIntel",
    maxTouchPoints: 5,
    standalone: false,
  });

  assert.equal(context.isIOS, true);
  assert.equal(context.shouldShowIOSAddToHomeScreenGate, true);
});
