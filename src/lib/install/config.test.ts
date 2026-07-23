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

test("installed app href returns to the intended route without reopening install", () => {
  assert.equal(
    getInstalledAppHref("/login"),
    "/login?installedApp=1",
  );
});

test("install return and bypass helpers reject external targets", () => {
  assert.equal(getInstallRouteHrefForReturnTo("https://evil.example/login"), "/install?returnTo=%2Flogin");
  assert.equal(getInstallBypassHref("//evil.example/login"), "/login?installBypass=1");
});

test("install guidance requires an explicit continuation and preserves iOS auth return paths", () => {
  const installSource = readFileSync(new URL("../../components/install/InstallRouteSurface.tsx", import.meta.url), "utf8");
  const iosSource = readFileSync(new URL("../../components/install/IOSAddToHomeScreenGate.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(installSource, /shouldAutoContinueWithoutGuide/);
  assert.doesNotMatch(installSource, /router\.replace\(getInstallBypassHref/);
  assert.match(installSource, /primaryHref=\{installPrompt\.canPromptInstall \? undefined : continueHref\}/);
  assert.match(installSource, /primaryHref=\{continueHref\}/);
  assert.match(iosSource, /primaryHref=\{primaryHref\}/);
  assert.match(iosSource, /primaryLabel="Continue"/);
});

test("browser fallback preserves the full install presentation alongside explicit continuation", () => {
  const installSource = readFileSync(new URL("../../components/install/InstallRouteSurface.tsx", import.meta.url), "utf8");

  assert.match(installSource, /Use the browser install prompt here, or open Fitness directly\./);
  assert.match(installSource, /Menu Install/);
  assert.match(installSource, /This browser is not offering the one-tap install prompt right now\./);
  assert.match(installSource, /Look for Share, Add to Home Screen, or Install app depending on your browser\./);
  assert.match(installSource, /primaryLabel=\{installPrompt\.canPromptInstall \? undefined : "Open Fitness"\}/);
  assert.doesNotMatch(installSource, /Manual Open/);
});
