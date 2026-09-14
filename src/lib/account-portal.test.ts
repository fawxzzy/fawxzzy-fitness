import assert from "node:assert/strict";
import test from "node:test";
import {
  getFitnessAccountPortalUrl,
  getFitnessLoginPortalUrl,
  resolveFitnessHandoffReturnPath,
} from "./account-portal";

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

test("Fitness login handoff keeps return targets inside the portal consumer allowlist", () => {
  assert.equal(resolveFitnessHandoffReturnPath(undefined), "/entry");
  assert.equal(resolveFitnessHandoffReturnPath("/"), "/");
  assert.equal(resolveFitnessHandoffReturnPath("/today"), "/today");
  assert.equal(resolveFitnessHandoffReturnPath("/account"), "/entry");
  assert.equal(resolveFitnessHandoffReturnPath("/today?tab=history"), "/entry");
  assert.equal(resolveFitnessHandoffReturnPath("//attacker.example"), "/entry");
  assert.equal(resolveFitnessHandoffReturnPath("https://attacker.example/today"), "/entry");
  assert.equal(
    getFitnessLoginPortalUrl("/today"),
    "https://account.fawxzzy.com/login?app=fitness&returnTo=https%3A%2F%2Ffitness.fawxzzy.com%2Ftoday",
  );
  assert.equal(
    getFitnessLoginPortalUrl("//attacker.example"),
    "https://account.fawxzzy.com/login?app=fitness&returnTo=https%3A%2F%2Ffitness.fawxzzy.com%2Fentry",
  );
});
