import assert from "node:assert/strict";
import test from "node:test";
import { authNotice } from "@/components/auth/authMessages";
import { DEVICE_SIGN_OUT_FAILURE_NOTICE_ID, runDeviceSignOut, subscribePageShowReset, type DeviceSignOutDependencies } from "./device-sign-out";

test("the failure notice is the copy-matrix account.signoutfail error", () => {
  assert.deepEqual(authNotice(DEVICE_SIGN_OUT_FAILURE_NOTICE_ID), {
    id: "account.signoutfail",
    tone: "error",
    text: "Could not sign out. Try again.",
  });
});

function harness(overrides: Partial<DeviceSignOutDependencies> = {}) {
  const calls: string[] = [];
  const dependencies: DeviceSignOutDependencies = {
    resolveDestination: () => {
      calls.push("resolve");
      return "/login";
    },
    revoke: async () => {
      calls.push("revoke");
      return { ok: true };
    },
    signOutLocally: async () => {
      calls.push("local");
    },
    clearLocalState: () => {
      calls.push("clear");
    },
    navigate: (destination) => {
      calls.push(`navigate:${destination}`);
    },
    ...overrides,
  };
  return { calls, dependencies };
}

test("success: revoke, then local sign-out, then clear, then exactly one navigation", async () => {
  const { calls, dependencies } = harness();
  assert.deepEqual(await runDeviceSignOut(dependencies), { ok: true, destination: "/login" });
  assert.deepEqual(calls, ["resolve", "revoke", "local", "clear", "navigate:/login"]);
});

test("a non-2xx revoke response stays on the screen: no local sign-out, no clear, no navigation", async () => {
  const { calls, dependencies } = harness({
    revoke: async () => {
      calls.push("revoke");
      return { ok: false };
    },
  });
  assert.deepEqual(await runDeviceSignOut(dependencies), { ok: false, reason: "revoke" });
  assert.deepEqual(calls, ["resolve", "revoke"]);
});

test("a network error on revoke stays on the screen and never rejects", async () => {
  const { calls, dependencies } = harness({
    revoke: async () => {
      calls.push("revoke");
      throw new TypeError("Failed to fetch");
    },
  });
  assert.deepEqual(await runDeviceSignOut(dependencies), { ok: false, reason: "revoke" });
  assert.deepEqual(calls, ["resolve", "revoke"]);
});

test("a local sign-out throw after a good revoke does not navigate", async () => {
  const { calls, dependencies } = harness({
    signOutLocally: async () => {
      calls.push("local");
      throw new Error("lock");
    },
  });
  assert.deepEqual(await runDeviceSignOut(dependencies), { ok: false, reason: "local" });
  assert.deepEqual(calls, ["resolve", "revoke", "local"]);
});

test("unavailable storage (SecurityError on clear) is best-effort and still signs out", async () => {
  const { calls, dependencies } = harness({
    clearLocalState: () => {
      calls.push("clear");
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
  assert.deepEqual(await runDeviceSignOut(dependencies), { ok: true, destination: "/login" });
  assert.deepEqual(calls, ["resolve", "revoke", "local", "clear", "navigate:/login"]);
});

test("a throw while choosing the destination fails before any request (pending can always reset)", async () => {
  const { calls, dependencies } = harness({
    resolveDestination: () => {
      calls.push("resolve");
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
  assert.deepEqual(await runDeviceSignOut(dependencies), { ok: false, reason: "unexpected" });
  assert.deepEqual(calls, ["resolve"]);
});

test("a throwing navigation resolves to a failure instead of rejecting", async () => {
  const { dependencies } = harness({
    navigate: () => {
      throw new Error("blocked");
    },
  });
  assert.deepEqual(await runDeviceSignOut(dependencies), { ok: false, reason: "unexpected" });
});

function fakePageShowTarget() {
  const listeners = new Set<(event: Event) => void>();
  return {
    listeners,
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
      assert.equal(type, "pageshow");
      listeners.add(listener as (event: Event) => void);
    },
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
      assert.equal(type, "pageshow");
      listeners.delete(listener as (event: Event) => void);
    },
    fire: (persisted: boolean) => listeners.forEach((listener) => listener({ persisted } as unknown as Event)),
  };
}

test("a bfcache restore (pageshow persisted) resets the pending state; a normal pageshow does not", () => {
  const target = fakePageShowTarget();
  let resets = 0;
  subscribePageShowReset(() => { resets += 1; }, target);
  target.fire(false);
  assert.equal(resets, 0);
  target.fire(true);
  assert.equal(resets, 1);
});

test("the pageshow subscription is removed on unsubscribe", () => {
  const target = fakePageShowTarget();
  let resets = 0;
  const unsubscribe = subscribePageShowReset(() => { resets += 1; }, target);
  unsubscribe();
  assert.equal(target.listeners.size, 0);
  target.fire(true);
  assert.equal(resets, 0);
});
