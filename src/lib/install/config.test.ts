import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getCanonicalInstallUrl,
  getInstalledAppHref,
  getInstallBypassHref,
  getInstallRouteHrefForReturnTo,
  getInstallUrlForContext,
  getIOSBrowserInstallUrl,
} from "@/lib/install/config";

function withAppUrl(appUrl: string | undefined, run: () => void) {
  const originalPublicUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalAppUrl = process.env.APP_URL;
  const originalProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const originalVercelUrl = process.env.VERCEL_URL;

  if (appUrl) {
    process.env.NEXT_PUBLIC_APP_URL = appUrl;
  } else {
    delete process.env.NEXT_PUBLIC_APP_URL;
  }

  delete process.env.APP_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  delete process.env.VERCEL_URL;

  try {
    run();
  } finally {
    if (originalPublicUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalPublicUrl;
    }

    if (originalAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = originalAppUrl;
    }

    if (originalProductionUrl === undefined) {
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    } else {
      process.env.VERCEL_PROJECT_PRODUCTION_URL = originalProductionUrl;
    }

    if (originalVercelUrl === undefined) {
      delete process.env.VERCEL_URL;
    } else {
      process.env.VERCEL_URL = originalVercelUrl;
    }
  }
}

test("canonical install URL strips trailing app URL slashes", () => {
  withAppUrl("http://127.0.0.1:3002///", () => {
    assert.equal(getCanonicalInstallUrl(), "http://127.0.0.1:3002/install");
  });
});

test("canonical install URL falls back to the branded Fitness origin", () => {
  withAppUrl(undefined, () => {
    assert.equal(getCanonicalInstallUrl(), "https://fitness.fawxzzy.com/install");
  });
});

test("install context URL appends the exact install step override", () => {
  withAppUrl("https://example.test", () => {
    assert.equal(
      getInstallUrlForContext("ios-safari"),
      "https://example.test/install?installContext=ios-safari",
    );
  });
});

test("iOS browser handoff URL targets Safari install guidance instead of the in-app gate", () => {
  withAppUrl("https://example.test", () => {
    assert.equal(getIOSBrowserInstallUrl(), "https://example.test/install?installContext=ios-safari");
  });
});

test("missing context keeps the plain install URL", () => {
  withAppUrl("https://example.test", () => {
    assert.equal(getInstallUrlForContext(null), "https://example.test/install");
  });
});

test("install gate href preserves a safe local return target", () => {
  assert.equal(
    getInstallRouteHrefForReturnTo("/reset-password?token=abc"),
    "/install?returnTo=%2Freset-password%3Ftoken%3Dabc",
  );
});

test("install bypass href returns to the intended auth route with a one-time bypass flag", () => {
  assert.equal(
    getInstallBypassHref("/signup?ref=launch"),
    "/signup?ref=launch&installBypass=1",
  );
});

test("installed app href routes the legacy login target through authenticated entry without reopening install", () => {
  assert.equal(
    getInstalledAppHref("/login"),
    "/entry?installedApp=1",
  );
});

test("installed app href preserves an intended non-login route", () => {
  assert.equal(
    getInstalledAppHref("/today?view=week"),
    "/today?view=week&installedApp=1",
  );
});

test("install return and bypass helpers reject external targets", () => {
  assert.equal(getInstallRouteHrefForReturnTo("https://evil.example/login"), "/install?returnTo=%2Flogin");
  assert.equal(getInstallBypassHref("//evil.example/login"), "/login?installBypass=1");
});

// Auth Surface v2 (Zac 2026-11-15): updated deliberately. The install family is one InstallScreen with a kind per real
// situation; the no-bypass rules from v1 are kept word for word in spirit: no screen offers a way into the app before it
// runs installed, and nothing says "Open Fitness".
test("install guidance does not offer a continuation before standalone mode", () => {
  const installSource = readFileSync(new URL("../../components/install/InstallRouteSurface.tsx", import.meta.url), "utf8");
  const iosSource = readFileSync(new URL("../../components/install/IOSAddToHomeScreenGate.tsx", import.meta.url), "utf8");
  const chromeSource = readFileSync(new URL("../../components/install/InstallGateChrome.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(installSource, /shouldAutoContinueWithoutGuide/);
  assert.doesNotMatch(installSource, /router\.replace\(getInstallBypassHref/);
  assert.doesNotMatch(installSource, /getInstallBypassHref/);
  assert.doesNotMatch(installSource, /continueHref/);
  assert.doesNotMatch(installSource, /primaryHref=/);
  assert.match(iosSource, /<InstallScreen kind="ios-safari" \/>/);
  assert.doesNotMatch(iosSource, /primaryHref=/);
  assert.doesNotMatch(chromeSource, /href=|continueHref|primaryHref|getInstallBypassHref|getInstalledAppHref/);
});

test("supported browsers receive concise per-context install steps", () => {
  const installSource = readFileSync(new URL("../../components/install/InstallRouteSurface.tsx", import.meta.url), "utf8");
  const chromeSource = readFileSync(new URL("../../components/install/InstallGateChrome.tsx", import.meta.url), "utf8");

  assert.match(chromeSource, /export const IOS_SAFARI_INSTALL_STEPS/);
  assert.match(chromeSource, /export const MANUAL_INSTALL_STEPS/);
  assert.match(chromeSource, /Tap Share <AuthShareIcon \/> in Safari\./);
  assert.match(chromeSource, /Choose Add to Home Screen <AuthAddIcon \/>\./);
  assert.match(chromeSource, /aria-label="Install Fitness"/);
  assert.match(installSource, /context\.canUseNativeInstallPrompt/);
  assert.match(installSource, /return "manual";/);
  assert.doesNotMatch(installSource, /"Open Fitness"/);
  assert.doesNotMatch(chromeSource, /"Open Fitness"/);
});

test("unsupported browsers receive truthful supported-browser guidance without app entry", () => {
  const installSource = readFileSync(new URL("../../components/install/InstallRouteSurface.tsx", import.meta.url), "utf8");
  const chromeSource = readFileSync(new URL("../../components/install/InstallGateChrome.tsx", import.meta.url), "utf8");

  assert.match(installSource, /if \(!context\.hasSupportedInstallPath\) \{\s*return "unsupported";/);
  assert.match(chromeSource, /unsupported: "Open this page in Safari, Chrome or Edge to install\."/);
  // Only the in-app (copy link) and native-prompt (Install) screens have a dock; neither enters the app.
  assert.equal((chromeSource.match(/<AuthDockButton/g) ?? []).length, 2);
});

test("iOS in-app guidance is distinct from Safari and does not expose an install-bypass continuation", () => {
  const installSource = readFileSync(new URL("../../components/install/InstallRouteSurface.tsx", import.meta.url), "utf8");
  const chromeSource = readFileSync(new URL("../../components/install/InstallGateChrome.tsx", import.meta.url), "utf8");
  // The context flags share the name; the gate components themselves are never rendered here.
  assert.doesNotMatch(installSource, /<IOSOpenInSafariGate|<IOSAddToHomeScreenGate|components\/install\/IOS/);
  assert.match(installSource, /if \(context\.shouldShowIOSOpenInSafariGate\) \{\s*return "ios-inapp";/);
  assert.match(chromeSource, /"ios-inapp": "Open this page in Safari to install\."/);
  assert.match(chromeSource, /export const IOS_IN_APP_INSTALL_STEPS/);
  assert.match(chromeSource, /copyState === "copied" \? "Link copied" : "Copy link"/);
  assert.doesNotMatch(chromeSource, /primaryHref|primaryLabel/);
});

test("the Android install surface does not expose an app-entry bypass", () => {
  const installSource = readFileSync(new URL("../../components/install/InstallRouteSurface.tsx", import.meta.url), "utf8");
  const chromeSource = readFileSync(new URL("../../components/install/InstallGateChrome.tsx", import.meta.url), "utf8");
  const contextSource = readFileSync(new URL("./getInstallContext.ts", import.meta.url), "utf8");

  assert.match(contextSource, /const shouldBlockAppAccess = !isStandalone/);
  assert.match(chromeSource, /"Choose Install app\."/);
  assert.doesNotMatch(installSource, /You can still open Fitness normally/);
  assert.doesNotMatch(chromeSource, /You can still open Fitness normally/);
});

test("the protected app shell routes iOS in-app access to the install surface", () => {
  const homeSource = readFileSync(new URL("../../app/page.tsx", import.meta.url), "utf8");
  const loginSource = readFileSync(new URL("../../app/login/page.tsx", import.meta.url), "utf8");
  const signupSource = readFileSync(new URL("../../app/signup/page.tsx", import.meta.url), "utf8");
  const gateSource = readFileSync(new URL("../../components/install/ProtectedAppInstallGate.tsx", import.meta.url), "utf8");

  assert.match(homeSource, /redirect\("\/entry"\)/);
  assert.doesNotMatch(homeSource, /getInstallRouteHrefForReturnTo/);
  assert.doesNotMatch(loginSource, /getInstallRouteHrefForReturnTo|INSTALL_BYPASS_QUERY_PARAM|INSTALLED_APP_QUERY_PARAM/);
  assert.doesNotMatch(signupSource, /getInstallRouteHrefForReturnTo|INSTALL_BYPASS_QUERY_PARAM|INSTALLED_APP_QUERY_PARAM/);
  assert.match(gateSource, /shouldBlockAppAccess/);
  assert.match(gateSource, /isInstallGatePublicPath\(pathname\)/);
  assert.match(gateSource, /context\.shouldBlockAppAccess && !isPublicRoute/);
  assert.match(gateSource, /getInstallRouteHrefForReturnTo\(currentPath\)/);
});
