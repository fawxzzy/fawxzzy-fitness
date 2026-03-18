import test from "node:test";
import assert from "node:assert/strict";

import { getTodayGlobalErrorMessage } from "./today-page-state";

test("getTodayGlobalErrorMessage hides stale redirect errors during normal browsing", () => {
  assert.equal(
    getTodayGlobalErrorMessage({ searchParamError: "Unable to discard", hasInProgressSession: false, fetchFailed: false }),
    null,
  );
  assert.equal(
    getTodayGlobalErrorMessage({ searchParamError: "Unable to discard", hasInProgressSession: true, fetchFailed: true }),
    null,
  );
});

test("getTodayGlobalErrorMessage keeps active in-progress flow errors visible", () => {
  assert.equal(
    getTodayGlobalErrorMessage({ searchParamError: "Unable to discard", hasInProgressSession: true, fetchFailed: false }),
    "Unable to discard",
  );
});
