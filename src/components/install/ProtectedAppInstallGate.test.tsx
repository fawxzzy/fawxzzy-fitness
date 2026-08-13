import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getInstallContext } from "@/lib/install/getInstallContext";

test("iOS in-app browsers redirect protected routes while preserving the password-recovery token bridge", () => {
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
  assert.match(source, /pathname === "\/reset-password" && searchParams\.get\("recovery"\) === "1"/);
  assert.match(source, /context\.shouldBlockAppAccess && pathname !== "\/install" && !isPasswordRecovery/);
  assert.match(source, /router\.replace\(getInstallRouteHrefForReturnTo\(currentPath\)\)/);
  assert.match(source, /!hasResolvedClientInstallContext \|\| shouldRedirectToInstall/);
  assert.match(source, /return <RouteLoading label="Opening install guide" variant="route" \/>;/);
});
