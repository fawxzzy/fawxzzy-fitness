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

test("install guidance does not offer a continuation before standalone mode", () => {
  const installSource = readFileSync(new URL("../../components/install/InstallRouteSurface.tsx", import.meta.url), "utf8");
  const iosSource = readFileSync(new URL("../../components/install/IOSAddToHomeScreenGate.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(installSource, /shouldAutoContinueWithoutGuide/);
  assert.doesNotMatch(installSource, /router\.replace\(getInstallBypassHref/);
  assert.doesNotMatch(installSource, /getInstallBypassHref/);
  assert.doesNotMatch(installSource, /continueHref/);
  assert.doesNotMatch(installSource, /primaryHref=/);
  assert.match(iosSource, /primaryHref=\{primaryHref\}/);
  assert.match(iosSource, /primaryLabel=\{primaryHref \? "Continue" : undefined\}/);
});

test("desktop browser install presentation does not expose an app-entry continuation", () => {
  const installSource = readFileSync(new URL("../../components/install/InstallRouteSurface.tsx", import.meta.url), "utf8");

  assert.match(installSource, /Install Fitness from this browser, then open it from the new app icon\./);
  assert.match(installSource, /Menu Install/);
  assert.match(installSource, /This browser is not offering the one-tap install prompt right now\. Use your browser menu to add Fitness/);
  assert.match(installSource, /Look for Share, Add to Home Screen, or Install app depending on your browser\./);
  assert.doesNotMatch(installSource, /"Open Fitness"/);
  assert.doesNotMatch(installSource, /Manual Open/);
});

test("iOS in-app guidance does not expose an install-bypass continuation", () => {
  const installSource = readFileSync(new URL("../../components/install/InstallRouteSurface.tsx", import.meta.url), "utf8");
  const chromeSource = readFileSync(new URL("../../components/install/InstallGateChrome.tsx", import.meta.url), "utf8");
  const inAppGate = installSource.split("if (context.shouldShowIOSOpenInSafariGate)")[1]?.split("if (context.shouldShowIOSAddToHomeScreenGate)")[0] ?? "";

  assert.doesNotMatch(inAppGate, /primaryHref=\{continueHref\}/);
  assert.doesNotMatch(chromeSource, /showCopyButton && primaryHref && primaryLabel/);
});

test("the Android install surface does not expose an app-entry bypass", () => {
  const installSource = readFileSync(new URL("../../components/install/InstallRouteSurface.tsx", import.meta.url), "utf8");
  const contextSource = readFileSync(new URL("./getInstallContext.ts", import.meta.url), "utf8");

  assert.match(contextSource, /const shouldBlockAppAccess = !isStandalone/);
  assert.match(installSource, /Install Fitness from this browser, then open it from the new app icon\./);
  assert.doesNotMatch(installSource, /You can still open Fitness normally/);
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
  assert.match(gateSource, /pathname !== "\/install"/);
  assert.match(gateSource, /getInstallRouteHrefForReturnTo\(currentPath\)/);
});
