import assert from "node:assert/strict";
import { execFile as executeFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  FITNESS_HANDOFF_AUDIENCE,
  FITNESS_HANDOFF_ISSUER,
  FITNESS_HANDOFF_MASTER_PROJECT_REF,
  FITNESS_HANDOFF_MASTER_SUPABASE_URL,
  FITNESS_HANDOFF_READINESS_CONTRACT_VERSION,
  getFitnessHandoffReadiness,
  isFitnessHandoffMasterUrl,
  type FitnessHandoffRecord,
  type FitnessHandoffRuntime,
} from "@/lib/auth-handoff";
import {
  createFitnessHandoffSupabaseStore,
  FITNESS_HANDOFF_BEGIN_RPC,
  FITNESS_HANDOFF_CONSUME_RPC,
  type FitnessHandoffRpcClient,
} from "@/lib/auth-handoff-supabase-store";

const execFile = promisify(executeFile);

const record: FitnessHandoffRecord = {
  audience: FITNESS_HANDOFF_AUDIENCE,
  bindingDigest: "binding-digest",
  expiresAt: 2_000,
  handoffId: "handoff-secret",
  issuer: FITNESS_HANDOFF_ISSUER,
  returnTo: "/today",
};

type Row = {
  audience: string;
  binding_digest: string;
  expires_at: string;
  handoff_digest: string;
  issuer: string;
  return_to: string;
};

async function createDatabase(directory: string) {
  const database = new PGlite(directory);
  await database.query(`
    create table if not exists auth_handoffs (
      handoff_digest text primary key,
      audience text not null,
      binding_digest text not null,
      issuer text not null,
      return_to text not null,
      expires_at timestamptz not null
    )
  `);
  return database;
}

function createPgliteRpcClient(database: PGlite): FitnessHandoffRpcClient {
  return {
    async rpc(name, args) {
      if (name === FITNESS_HANDOFF_BEGIN_RPC) {
        const result = await database.query<Row>(`
          insert into auth_handoffs (handoff_digest, audience, binding_digest, issuer, return_to, expires_at)
          values ($1, $2, $3, $4, $5, $6::timestamptz)
          on conflict (handoff_digest) do nothing
          returning handoff_digest
        `, [
          args.p_handoff_digest,
          args.p_audience,
          args.p_binding_digest,
          args.p_issuer,
          args.p_return_to,
          args.p_expires_at,
        ]);
        return { data: result.rows.length === 1, error: null };
      }

      if (name === FITNESS_HANDOFF_CONSUME_RPC) {
        const result = await database.query<Row>(`
          delete from auth_handoffs
          where handoff_digest = $1
            and audience = $2
            and binding_digest = $3
            and issuer = $4
            and expires_at > $5::timestamptz
          returning return_to
        `, [
          args.p_handoff_digest,
          args.p_audience,
          args.p_binding_digest,
          args.p_issuer,
          args.p_now,
        ]);
        return { data: result.rows, error: null };
      }

      return { data: null, error: new Error("Unexpected RPC") };
    },
  };
}

async function withDatabase(run: (directory: string, database: PGlite) => Promise<void>) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "fitness-handoff-store-"));
  let database: PGlite | null = null;
  try {
    database = await createDatabase(directory);
    await run(directory, database);
  } finally {
    try {
      await database?.close();
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "PGlite is closed") {
        throw error;
      }
    }
    await rm(directory, { force: true, recursive: true });
  }
}

async function readRuntimeState(environment: Record<string, string>) {
  const probe = [
    'import { getFitnessHandoffRuntime } from "./src/lib/auth-handoff.ts";',
    'process.stdout.write(getFitnessHandoffRuntime() ? "active" : "null");',
  ].join(" ");
  const { stdout } = await execFile(process.execPath, [
    "--import",
    "./scripts/register-test-aliases.mjs",
    "--input-type=module",
    "--eval",
    probe,
  ], {
    cwd: process.cwd(),
    // Preserve the test's deliberately minimal handoff environment while
    // satisfying this repository's required Node process-environment shape.
    env: { NODE_ENV: process.env.NODE_ENV ?? "test", ...environment },
  });
  return stdout.trim();
}

test("Supabase handoff adapter stores only the opaque handoff digest", async () => {
  const invocation: { value: { args: Record<string, string>; name: string } | null } = { value: null };
  const store = createFitnessHandoffSupabaseStore({
    async rpc(name, args) {
      invocation.value = { args, name };
      return { data: true, error: null };
    },
  });

  assert.equal(await store.begin(record), true);
  assert.ok(invocation.value);
  const captured = invocation.value;
  assert.equal(captured.name, FITNESS_HANDOFF_BEGIN_RPC);
  assert.notEqual(captured.args.p_handoff_digest, record.handoffId);
  assert.equal(captured.args.p_return_to, "/today");
});

test("durable store atomically permits one concurrent consume and rejects replay", async () => {
  await withDatabase(async (_directory, database) => {
    const store = createFitnessHandoffSupabaseStore(createPgliteRpcClient(database));
    assert.equal(await store.begin(record), true);

    const results = await Promise.all(Array.from({ length: 8 }, () => store.consume({
      audience: record.audience,
      bindingDigest: record.bindingDigest,
      handoffId: record.handoffId,
      issuer: record.issuer,
      now: 1_900,
    })));

    assert.equal(results.filter(Boolean).length, 1);
    assert.deepEqual(results.find(Boolean), { returnTo: "/today" });
    assert.equal(await store.consume({
      audience: record.audience,
      bindingDigest: record.bindingDigest,
      handoffId: record.handoffId,
      issuer: record.issuer,
      now: 1_900,
    }), null);
  });
});

test("durable records survive a separate process restart and reject expiry, audience, issuer, and binding drift", async () => {
  await withDatabase(async (directory, database) => {
    await database.close();
    await execFile(process.execPath, [
      "scripts/qa/fitness-auth-handoff-pglite-seed.mjs",
      directory,
      JSON.stringify(record),
    ], { cwd: process.cwd() });

    const restarted = await createDatabase(directory);
    const store = createFitnessHandoffSupabaseStore(createPgliteRpcClient(restarted));
    assert.equal(await store.consume({ ...record, now: 2_000 }), null);
    assert.equal(await store.consume({ ...record, audience: "other" as typeof record.audience, bindingDigest: record.bindingDigest, now: 1_900 }), null);
    assert.equal(await store.consume({ ...record, audience: FITNESS_HANDOFF_AUDIENCE, bindingDigest: "wrong", now: 1_900 }), null);
    assert.equal(await store.consume({ ...record, audience: FITNESS_HANDOFF_AUDIENCE, issuer: "https://wrong.example/auth/v1" as typeof record.issuer, now: 1_900 }), null);
    assert.deepEqual(await store.consume({ ...record, now: 1_900 }), { returnTo: "/today" });
    await restarted.close();
  });
});

test("the handoff runtime accepts only the exact master Supabase audience URL", () => {
  assert.equal(isFitnessHandoffMasterUrl(FITNESS_HANDOFF_MASTER_SUPABASE_URL), true);
  assert.equal(isFitnessHandoffMasterUrl(`${FITNESS_HANDOFF_MASTER_SUPABASE_URL}/`), false);
  assert.equal(isFitnessHandoffMasterUrl("https://lpswxoyfniocuhljgzbc.supabase.co"), false);
});

test("runtime configuration fails closed for missing, malformed, and legacy Supabase bindings", async () => {
  const base = {
    FITNESS_AUTH_HANDOFF_ENABLED: "1",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key",
  };
  assert.equal(await readRuntimeState(base), "null");
  assert.equal(await readRuntimeState({ ...base, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" }), "null");
  assert.equal(await readRuntimeState({ ...base, NEXT_PUBLIC_SUPABASE_URL: "https://lpswxoyfniocuhljgzbc.supabase.co" }), "null");
  assert.equal(await readRuntimeState({ ...base, NEXT_PUBLIC_SUPABASE_URL: FITNESS_HANDOFF_MASTER_SUPABASE_URL }), "active");
});

test("runtime readiness attests only the exact master audience, immutable source, and available store", () => {
  const runtime: FitnessHandoffRuntime = {
    now: () => 0,
    store: { begin: async () => true, consume: async () => null },
  };
  const sourceCommit = "a".repeat(40);
  const expected = {
    authProjectRef: FITNESS_HANDOFF_MASTER_PROJECT_REF,
    contractVersion: FITNESS_HANDOFF_READINESS_CONTRACT_VERSION,
    handoffStore: "available",
    sourceCommit,
  };

  assert.deepEqual(getFitnessHandoffReadiness(runtime, {
    NEXT_PUBLIC_SUPABASE_URL: FITNESS_HANDOFF_MASTER_SUPABASE_URL,
    VERCEL_GIT_COMMIT_SHA: sourceCommit,
  }), expected);
  assert.deepEqual(getFitnessHandoffReadiness(runtime, {
    NEXT_PUBLIC_SUPABASE_URL: FITNESS_HANDOFF_MASTER_SUPABASE_URL,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: sourceCommit,
    VERCEL_GIT_COMMIT_SHA: sourceCommit,
  }), expected);
  assert.equal(getFitnessHandoffReadiness(runtime, {
    NEXT_PUBLIC_SUPABASE_URL: "https://lpswxoyfniocuhljgzbc.supabase.co",
    VERCEL_GIT_COMMIT_SHA: sourceCommit,
  }), null);
  assert.equal(getFitnessHandoffReadiness(runtime, {
    NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
    VERCEL_GIT_COMMIT_SHA: sourceCommit,
  }), null);
  assert.equal(getFitnessHandoffReadiness(runtime, {
    NEXT_PUBLIC_SUPABASE_URL: FITNESS_HANDOFF_MASTER_SUPABASE_URL,
  }), null);
  assert.equal(getFitnessHandoffReadiness(runtime, {
    NEXT_PUBLIC_SUPABASE_URL: FITNESS_HANDOFF_MASTER_SUPABASE_URL,
    VERCEL_GIT_COMMIT_SHA: "not-a-commit",
  }), null);
  assert.equal(getFitnessHandoffReadiness(runtime, {
    NEXT_PUBLIC_SUPABASE_URL: FITNESS_HANDOFF_MASTER_SUPABASE_URL,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: "b".repeat(40),
    VERCEL_GIT_COMMIT_SHA: sourceCommit,
  }), null);
  assert.equal(getFitnessHandoffReadiness(null, {
    NEXT_PUBLIC_SUPABASE_URL: FITNESS_HANDOFF_MASTER_SUPABASE_URL,
    VERCEL_GIT_COMMIT_SHA: sourceCommit,
  }), null);
});

test("adapter returns categorical failures without surfacing backend details", async () => {
  const store = createFitnessHandoffSupabaseStore({
    async rpc() {
      return { data: null, error: new Error("sensitive backend detail") };
    },
  });

  assert.equal(await store.begin(record), false);
  assert.equal(await store.consume({ ...record, now: 1_900 }), null);
});
