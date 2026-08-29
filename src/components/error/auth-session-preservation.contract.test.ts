import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const recoveryScreenSource = await readFile(new URL("./AppRecoveryScreen.tsx", import.meta.url), "utf8");
const softBoundarySource = await readFile(new URL("./AppSoftErrorBoundary.tsx", import.meta.url), "utf8");

test("generic app errors preserve valid auth sessions", () => {
  for (const source of [recoveryScreenSource, softBoundarySource]) {
    assert.doesNotMatch(source, /SESSION_RECOVERY_ROUTE/);
    assert.doesNotMatch(source, /SESSION_EXPIRED_LOGIN_ERROR/);
    assert.doesNotMatch(source, /\/auth\/session-recovery/);
    assert.doesNotMatch(source, /clearClientRecoveryState/);
    assert.doesNotMatch(source, /window\.location\.assign/);
  }

  for (const source of [recoveryScreenSource, softBoundarySource]) {
    assert.match(source, /This error did not sign you out/);
    assert.match(source, /window\.location\.reload/);
  }
});
