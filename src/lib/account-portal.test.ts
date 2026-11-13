import assert from "node:assert/strict";
import test from "node:test";
import {
  getFitnessAccountPortalUrl,
  getFitnessLoginPortalUrl,
  getFitnessSignupPortalUrl,
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

test("Fitness sign-up portal URL adds exactly one intent=signup and keeps app and the handoff return allowlist", () => {
  assert.equal(
    getFitnessSignupPortalUrl("/today"),
    "https://account.fawxzzy.com/login?app=fitness&intent=signup&returnTo=https%3A%2F%2Ffitness.fawxzzy.com%2Ftoday",
  );
  assert.equal(
    getFitnessSignupPortalUrl(),
    "https://account.fawxzzy.com/login?app=fitness&intent=signup&returnTo=https%3A%2F%2Ffitness.fawxzzy.com%2Fentry",
  );

  const url = new URL(getFitnessSignupPortalUrl("/"));
  assert.equal(url.origin, "https://account.fawxzzy.com");
  assert.equal(url.pathname, "/login");
  assert.deepEqual([...url.searchParams.keys()].sort(), ["app", "intent", "returnTo"]);
  assert.deepEqual(url.searchParams.getAll("intent"), ["signup"]);
  assert.deepEqual(url.searchParams.getAll("app"), ["fitness"]);
  assert.deepEqual(url.searchParams.getAll("returnTo"), ["https://fitness.fawxzzy.com/"]);
});

test("Fitness sign-up return targets cannot leave the portal consumer allowlist", () => {
  for (const hostile of [
    "//attacker.example",
    "https://attacker.example/today",
    "/account",
    "/today?tab=history",
    "/today#fragment",
    "javascript:alert(1)",
    "",
    null,
    undefined,
  ]) {
    const url = new URL(getFitnessSignupPortalUrl(hostile));
    assert.deepEqual(url.searchParams.getAll("returnTo"), ["https://fitness.fawxzzy.com/entry"], String(hostile));
    assert.deepEqual(url.searchParams.getAll("intent"), ["signup"]);
  }
});

test("only the sign-up link carries intent; account and sign-in links are unchanged", () => {
  assert.ok(!getFitnessAccountPortalUrl().includes("intent"));
  assert.ok(!getFitnessAccountPortalUrl("/login").includes("intent"));
  assert.ok(!getFitnessLoginPortalUrl("/today").includes("intent"));
  assert.equal(
    getFitnessAccountPortalUrl("/login", "/today", { intent: "signup" }),
    "https://account.fawxzzy.com/login?app=fitness&intent=signup&returnTo=https%3A%2F%2Ffitness.fawxzzy.com%2Ftoday",
  );
});
