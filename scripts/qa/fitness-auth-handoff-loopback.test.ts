import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  FITNESS_HANDOFF_MASTER_PROJECT_REF,
  FITNESS_HANDOFF_READINESS_CONTRACT_VERSION,
} from "@/lib/auth-handoff";
import {
  FITNESS_HANDOFF_LOOPBACK_CONTRACT,
  startFitnessHandoffLoopback,
  SYNTHETIC_PORTAL_ACCESS_TOKEN,
  SYNTHETIC_PORTAL_REFRESH_TOKEN,
} from "./fitness-auth-handoff-loopback";

const PORTAL_ORIGIN = "https://account.fawxzzy.com";

function cookieValue(setCookie: string, name: string) {
  return setCookie.match(new RegExp(`(?:^|,)\\s*${name}=([^;]+)`))?.[1] ?? null;
}

async function begin(baseUrl: string) {
  const response = await fetch(`${baseUrl}/auth/session-handoff`, {
    body: JSON.stringify({ returnTo: "/today" }),
    headers: {
      "content-type": "application/json",
      origin: PORTAL_ORIGIN,
    },
    method: "POST",
  });
  const setCookie = response.headers.get("set-cookie") ?? "";
  const payload = await response.json() as {
    handoffId: string;
    ok: boolean;
    readiness: {
      authProjectRef: string;
      contractVersion: string;
      handoffStore: string;
      sourceCommit: string;
    };
    returnTo: string;
  };
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.readiness, {
    authProjectRef: FITNESS_HANDOFF_MASTER_PROJECT_REF,
    contractVersion: FITNESS_HANDOFF_READINESS_CONTRACT_VERSION,
    handoffStore: "available",
    sourceCommit: "0".repeat(40),
  });
  const binding = cookieValue(setCookie, "__Host-fitness-handoff");
  assert.ok(binding);
  return { binding, handoffId: payload.handoffId };
}

test("loopback fixture exposes only the durable synthetic handoff contract", async () => {
  const previousEnvironment = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "production");
  const loopback = await startFitnessHandoffLoopback();
  try {
    const health = await fetch(`${loopback.baseUrl}/__handoff-test/health`);
    assert.deepEqual(await health.json(), {
      contract: FITNESS_HANDOFF_LOOPBACK_CONTRACT,
      durable: true,
      ok: true,
      synthetic: true,
    });

    const started = await begin(loopback.baseUrl);
    const session = await fetch(`${loopback.baseUrl}/auth/session-sync`, {
      body: JSON.stringify({
        accessToken: SYNTHETIC_PORTAL_ACCESS_TOKEN,
        handoffId: started.handoffId,
        refreshToken: SYNTHETIC_PORTAL_REFRESH_TOKEN,
      }),
      headers: {
        "content-type": "application/json",
        cookie: `__Host-fitness-handoff=${started.binding}`,
        origin: PORTAL_ORIGIN,
      },
      method: "POST",
    });
    const setCookie = session.headers.get("set-cookie") ?? "";
    assert.equal(session.status, 200);
    assert.match(setCookie, /sb-access-token=portal-integration-synthetic-access/);
    assert.match(setCookie, /sb-refresh-token=portal-integration-synthetic-refresh/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /Secure/);

    const replay = await fetch(`${loopback.baseUrl}/auth/session-sync`, {
      body: JSON.stringify({
        accessToken: SYNTHETIC_PORTAL_ACCESS_TOKEN,
        handoffId: started.handoffId,
        refreshToken: SYNTHETIC_PORTAL_REFRESH_TOKEN,
      }),
      headers: {
        "content-type": "application/json",
        cookie: `__Host-fitness-handoff=${started.binding}`,
        origin: PORTAL_ORIGIN,
      },
      method: "POST",
    });
    assert.equal(replay.status, 401);
    assert.doesNotMatch(replay.headers.get("set-cookie") ?? "", /sb-(?:access|refresh)-token=/);
  } finally {
    await loopback.close();
    Reflect.set(process.env, "NODE_ENV", previousEnvironment);
  }
});

test("denied handoff binding does not mutate Fitness session cookies", async () => {
  const loopback = await startFitnessHandoffLoopback();
  const temporaryDirectory = loopback.temporaryDirectory;
  try {
    const started = await begin(loopback.baseUrl);
    const denied = await fetch(`${loopback.baseUrl}/auth/session-sync`, {
      body: JSON.stringify({
        accessToken: SYNTHETIC_PORTAL_ACCESS_TOKEN,
        handoffId: started.handoffId,
        refreshToken: SYNTHETIC_PORTAL_REFRESH_TOKEN,
      }),
      headers: {
        "content-type": "application/json",
        cookie: "__Host-fitness-handoff=hostile-binding",
        origin: PORTAL_ORIGIN,
      },
      method: "POST",
    });
    assert.equal(denied.status, 401);
    assert.doesNotMatch(denied.headers.get("set-cookie") ?? "", /sb-(?:access|refresh)-token=/);
  } finally {
    await loopback.close();
    assert.equal(existsSync(temporaryDirectory), false);
  }
});

test("fixture initialization failure removes its task-created temporary directory", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "fitness-handoff-loopback-init-failure-"));
  await assert.rejects(startFitnessHandoffLoopback({}, {
    closeDatabase: async () => undefined,
    createDatabase: async () => { throw new Error("synthetic initialization failure"); },
    createTemporaryDirectory: async () => temporaryDirectory,
    removeDirectory: async (directory) => rm(directory, { force: true, recursive: true }),
  }));
  assert.equal(existsSync(temporaryDirectory), false);
});

test("fixture cleanup removes its directory even if database close reports failure", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "fitness-handoff-loopback-close-failure-"));
  const loopback = await startFitnessHandoffLoopback({}, {
    closeDatabase: async (database) => {
      await database.close();
      throw new Error("synthetic close failure");
    },
    createDatabase: async (directory) => new PGlite(directory),
    createTemporaryDirectory: async () => temporaryDirectory,
    removeDirectory: async (directory) => rm(directory, { force: true, recursive: true }),
  });
  await assert.rejects(loopback.close());
  assert.equal(existsSync(temporaryDirectory), false);
});
