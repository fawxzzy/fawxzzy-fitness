import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getInstallContext } from "@/lib/install/getInstallContext";
import { isInstallGatePublicPath } from "@/lib/install/protectedAppRoutePolicy";

test("iOS in-app browsers redirect protected app routes but leave account and auth transport routes reachable", () => {
  const context = getInstallContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 326.0.0.0.90",
    platform: "iPhone",
    maxTouchPoints: 5,
    standalone: false,
  });

  assert.equal(context.shouldShowIOSOpenInSafariGate, true);
  assert.equal(context.shouldBlockAppAccess, true);

  const source = readFileSync(new URL("./ProtectedAppInstallGate.tsx", import.meta.url), "utf8");
  assert.match(source, /const isPublicRoute = isInstallGatePublicPath\(pathname\)/);
  assert.match(source, /context\.shouldBlockAppAccess && !isPublicRoute/);
  assert.match(source, /router\.replace\(getInstallRouteHrefForReturnTo\(currentPath\)\)/);
  assert.match(source, /!isPublicRoute && \(!hasResolvedClientInstallContext \|\| shouldRedirectToInstall\)/);
  assert.match(source, /return <RouteLoading label="Opening install guide" variant="route" \/>;/);

  for (const pathname of [
    "/install",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/privacy",
    "/terms",
    "/auth/session-handoff",
    "/auth/session-sync",
  ]) {
    assert.equal(isInstallGatePublicPath(pathname), true, pathname);
  }

  for (const pathname of ["/", "/entry", "/today", "/settings", "/account", "/session/abc"]) {
    assert.equal(isInstallGatePublicPath(pathname), false, pathname);
  }
});
