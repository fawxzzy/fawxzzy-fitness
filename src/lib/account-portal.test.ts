import assert from "node:assert/strict";
import test from "node:test";
import {
  getFitnessAccountPortalUrl,
  getFitnessLoginPortalUrl,
  getFitnessSignupPortalUrl,
  getFitnessSignupPortalUrlForSearch,
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

test("the sign-up redirect for an opened address narrows returnTo and forwards nothing else", () => {
  const entry = "https://fitness.fawxzzy.com/entry";
  const returnToOf = (search: string) => {
    const url = new URL(getFitnessSignupPortalUrlForSearch(search));
    assert.equal(url.origin, "https://account.fawxzzy.com");
    assert.equal(url.pathname, "/login");
    assert.deepEqual([...url.searchParams.keys()].sort(), ["app", "intent", "returnTo"]);
    assert.deepEqual(url.searchParams.getAll("app"), ["fitness"]);
    assert.deepEqual(url.searchParams.getAll("intent"), ["signup"]);
    return url.searchParams.get("returnTo");
  };

  assert.equal(returnToOf(""), entry);
  assert.equal(returnToOf("?returnTo=%2Ftoday"), "https://fitness.fawxzzy.com/today");
  assert.equal(returnToOf("?returnTo=%2F"), "https://fitness.fawxzzy.com/");
  for (const hostile of [
    "?returnTo=%2F%2Fevil.example",
    "?returnTo=%2F%2Fevil.example%2Ftoday",
    "?returnTo=https%3A%2F%2Fevil.example%2Ftoday",
    "?returnTo=%5Cevil.example",
    "?returnTo=javascript%3Aalert(1)",
    "?returnTo=%2Faccount",
    "?returnTo=%2Ftoday%3Ftab%3Dhistory",
    "?returnTo=%2Ftoday%23frag",
    "?returnTo=",
  ]) {
    assert.equal(returnToOf(hostile), entry, hostile);
  }

  // Foreign keys in the opened address are never forwarded to the portal.
  assert.equal(
    returnToOf("?app=mazer&intent=login&error=nope&info=hi&access_token=secret&refresh_token=secret&code=abc&returnTo=%2Ftoday"),
    "https://fitness.fawxzzy.com/today",
  );
  assert.ok(!getFitnessSignupPortalUrlForSearch("?access_token=secret&error=x").includes("secret"));
  // A repeated returnTo uses the first value, still allowlisted.
  assert.equal(returnToOf("?returnTo=%2Ftoday&returnTo=%2F%2Fevil.example"), "https://fitness.fawxzzy.com/today");
  assert.equal(returnToOf("?returnTo=%2F%2Fevil.example&returnTo=%2Ftoday"), entry);
});
