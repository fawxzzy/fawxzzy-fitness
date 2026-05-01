import assert from "node:assert/strict";
import test from "node:test";

import { hasRecoveryFragment, readRecoveryTokensFromHash } from "./recovery-fragment.ts";

test("hasRecoveryFragment detects recovery tokens in the location hash", () => {
  assert.equal(
    hasRecoveryFragment("#access_token=token-123&refresh_token=refresh-456&type=recovery"),
    true,
  );
});

test("readRecoveryTokensFromHash extracts recovery tokens from the hash", () => {
  assert.deepEqual(
    readRecoveryTokensFromHash("#access_token=token-123&refresh_token=refresh-456&type=recovery"),
    {
      accessToken: "token-123",
      refreshToken: "refresh-456",
      type: "recovery",
    },
  );
});

test("readRecoveryTokensFromHash returns blank values when the hash is not a recovery fragment", () => {
  assert.deepEqual(
    readRecoveryTokensFromHash("#error=access_denied"),
    {
      accessToken: "",
      refreshToken: "",
      type: "",
    },
  );
});
