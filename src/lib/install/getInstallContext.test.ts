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
  assert.equal(context.shouldBlockAppAccess, false);
  assert.equal(context.shouldAllowAppAccess, true);
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
  assert.equal(context.shouldBlockAppAccess, true);
  assert.equal(context.shouldAllowAppAccess, false);
});

test("detects link-in-bio iPhone browsers as Open in Safari gate", () => {
  const context = getInstallContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LinkMe/2.0",
    platform: "iPhone",
    maxTouchPoints: 5,
    standalone: false,
  });

  assert.equal(context.isInAppBrowser, true);
  assert.equal(context.shouldShowIOSOpenInSafariGate, true);
  assert.equal(context.shouldBlockAppAccess, true);
  assert.equal(context.shouldAllowAppAccess, false);
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
  assert.equal(context.shouldBlockAppAccess, false);
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
  assert.equal(context.shouldBlockAppAccess, false);
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
  assert.equal(context.shouldBlockAppAccess, false);
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
  assert.equal(context.shouldAllowAppAccess, true);
});

test("ios safari override remains guidance-only for local install QA", () => {
  const context = getInstallContext({
    override: "ios-safari",
    allowOverride: true,
    canUseNativeInstallPrompt: false,
  });

  assert.equal(context.shouldShowIOSAddToHomeScreenGate, true);
  assert.equal(context.shouldBlockAppAccess, false);
  assert.equal(context.shouldAllowAppAccess, true);
});

test("install context override is opt-in so protected routes cannot bypass install gate by query string", () => {
  const context = getInstallContext({
    override: "desktop",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 TikTok 37.1.0",
    platform: "iPhone",
    maxTouchPoints: 5,
    standalone: false,
  });

  assert.equal(context.isInAppBrowser, true);
  assert.equal(context.shouldShowIOSOpenInSafariGate, true);
  assert.equal(context.shouldBlockAppAccess, true);
});

test("public install route can force iOS in-app browser guidance from documented install context", () => {
  const context = getInstallContext({
    override: "ios-inapp",
    allowOverride: true,
  });

  assert.equal(context.platform, "ios");
  assert.equal(context.browserKind, "inApp");
  assert.equal(context.shouldShowIOSOpenInSafariGate, true);
  assert.equal(context.shouldBlockAppAccess, true);
});

test("public install route can force iOS standalone handoff from documented install context", () => {
  const context = getInstallContext({
    override: "ios-standalone",
    allowOverride: true,
  });

  assert.equal(context.platform, "ios");
  assert.equal(context.isStandalone, true);
  assert.equal(context.shouldShowIOSOpenInSafariGate, false);
  assert.equal(context.shouldShowIOSAddToHomeScreenGate, false);
  assert.equal(context.shouldBlockAppAccess, false);
  assert.equal(context.shouldAllowAppAccess, true);
});

test("documented Android and desktop install contexts resolve to concrete browser families", () => {
  const android = getInstallContext({
    override: "android-chrome",
    allowOverride: true,
  });
  const edge = getInstallContext({
    override: "desktop-windows-edge",
    allowOverride: true,
  });
  const safari = getInstallContext({
    override: "desktop-macos-safari",
    allowOverride: true,
  });

  assert.equal(android.platform, "android");
  assert.equal(android.browserKind, "chrome");
  assert.equal(edge.platform, "desktop");
  assert.equal(edge.browserKind, "edge");
  assert.equal(safari.platform, "desktop");
  assert.equal(safari.browserKind, "safari");
});
