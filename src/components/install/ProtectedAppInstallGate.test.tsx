import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProtectedAppInstallGate } from "@/components/install/ProtectedAppInstallGate";
import { getInstallContext } from "@/lib/install/getInstallContext";

test("iOS in-app browsers keep normal app content outside the explicit install route", () => {
  const context = getInstallContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 326.0.0.0.90",
    platform: "iPhone",
    maxTouchPoints: 5,
    standalone: false,
  });

  assert.equal(context.shouldShowIOSOpenInSafariGate, true);
  assert.equal(context.shouldBlockAppAccess, true);

  const html = renderToStaticMarkup(
    <ProtectedAppInstallGate>
      <main>Normal Fitness entry</main>
    </ProtectedAppInstallGate>,
  );

  assert.match(html, /Normal Fitness entry/);
  assert.doesNotMatch(html, /Open in Safari|Install Fitness/);
});
