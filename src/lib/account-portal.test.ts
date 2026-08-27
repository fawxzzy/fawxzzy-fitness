import assert from "node:assert/strict";
import test from "node:test";
import { getFitnessAccountPortalUrl } from "./account-portal";

test("Fitness account routes stay bound to the shared account host and presentation context", () => {
  assert.equal(
    getFitnessAccountPortalUrl(),
    "https://account.fawxzzy.com/account?app=fitness",
  );
  assert.equal(
    getFitnessAccountPortalUrl("/login"),
    "https://account.fawxzzy.com/login?app=fitness",
  );
  assert.equal(
    getFitnessAccountPortalUrl("/login", "/session/abc?returnTo=%2Ftoday"),
    "https://account.fawxzzy.com/login?app=fitness&returnTo=https%3A%2F%2Ffitness.fawxzzy.com%2Fsession%2Fabc%3FreturnTo%3D%252Ftoday",
  );
});
