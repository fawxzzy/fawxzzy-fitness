import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertExpectedFitnessSupabaseHost,
  assertSafeLocalSupabaseDev,
  DEFAULT_EXPECTED_SUPABASE_HOST,
  RETIRED_FITNESS_SUPABASE_HOST,
  mergeEnvFileWithShell,
  normalizeEnvValue,
  resolveEnvFilePaths,
} from "./env-file.mjs";

test("normalizeEnvValue strips wrapping quotes bom and escaped trailing newlines", () => {
  assert.equal(
    normalizeEnvValue("\"\uFEFF1508144612957622313\\r\\n\""),
    "1508144612957622313",
  );
});

test("resolveEnvFilePaths never discovers shared legacy or doctor environment files", () => {
  const atlasRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fitness-env-root-"));
  const repoRoot = path.join(atlasRoot, "repos", "fawxzzy-fitness");
  const secretsDir = path.join(atlasRoot, "secrets");
  fs.mkdirSync(repoRoot, { recursive: true });
  fs.mkdirSync(secretsDir, { recursive: true });

  fs.writeFileSync(
    path.join(secretsDir, "fitness-doctor.env"),
    "NEXT_PUBLIC_SUPABASE_URL=https://hcjbdxrekkbfbngrfvcv.supabase.co\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(secretsDir, "fitness-lps-dev.env"),
    "NEXT_PUBLIC_SUPABASE_URL=https://lpswxoyfniocuhljgzbc.supabase.co\n",
    "utf8",
  );

  const repoDefault = path.join(repoRoot, ".env.local");
  assert.deepEqual(resolveEnvFilePaths(repoRoot, ""), [repoDefault]);
  fs.writeFileSync(repoDefault, "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\n", "utf8");
  assert.deepEqual(resolveEnvFilePaths(repoRoot, ""), [repoDefault]);
});

test("resolveEnvFilePaths only resolves paths and never reads candidate credentials", (t) => {
  t.mock.method(fs, "existsSync", () => { throw new Error("No discovery permitted"); });
  t.mock.method(fs, "readFileSync", () => { throw new Error("No file reads permitted"); });
  const repoRoot = path.resolve("fixture-repo");
  assert.deepEqual(resolveEnvFilePaths(repoRoot, ""), [path.join(repoRoot, ".env.local")]);
  assert.deepEqual(resolveEnvFilePaths(repoRoot, " fixture.env "), [path.join(repoRoot, "fixture.env")]);
  const explicit = path.resolve("explicit-fixture.env");
  assert.deepEqual(resolveEnvFilePaths(repoRoot, explicit), [explicit]);
});

test("assertExpectedFitnessSupabaseHost fails with a clear mismatch error", () => {
  assert.throws(
    () => assertExpectedFitnessSupabaseHost({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://hcjbdxrekkbfbngrfvcv.supabase.co",
      },
      commandName: "feedback board export",
    }),
    /Expected bxtcuhkotumitoqtrcej\.supabase\.co, received hcjbdxrekkbfbngrfvcv\.supabase\.co/,
  );
});

test("assertExpectedFitnessSupabaseHost validates the supported SUPABASE_URL fallback", () => {
  assert.doesNotThrow(() => assertExpectedFitnessSupabaseHost({
    env: {
      SUPABASE_URL: "https://bxtcuhkotumitoqtrcej.supabase.co",
    },
    commandName: "feedback board export",
  }));

  assert.throws(
    () => assertExpectedFitnessSupabaseHost({
      env: {
        SUPABASE_URL: "https://hcjbdxrekkbfbngrfvcv.supabase.co",
      },
      commandName: "feedback board export",
    }),
    /Expected bxtcuhkotumitoqtrcej\.supabase\.co, received hcjbdxrekkbfbngrfvcv\.supabase\.co/,
  );
});

test("master is the expected hosted target without inventing a connection URL", () => {
  assert.equal(DEFAULT_EXPECTED_SUPABASE_HOST, "bxtcuhkotumitoqtrcej.supabase.co");
  assert.throws(() => assertExpectedFitnessSupabaseHost({ env: {} }), /without NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL/);
  assert.doesNotThrow(() => assertExpectedFitnessSupabaseHost({
    env: { NEXT_PUBLIC_SUPABASE_URL: `https://${DEFAULT_EXPECTED_SUPABASE_HOST}` },
  }));
});

test("legacy project cannot be enabled by expected-host overrides, ports, or fallback URLs", () => {
  for (const url of [
    `https://${RETIRED_FITNESS_SUPABASE_HOST}`,
    `https://${RETIRED_FITNESS_SUPABASE_HOST.toUpperCase()}:8443`,
    `https://${RETIRED_FITNESS_SUPABASE_HOST}.`,
  ]) {
    for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]) {
      assert.throws(() => assertExpectedFitnessSupabaseHost({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: `https://${DEFAULT_EXPECTED_SUPABASE_HOST}`,
          [key]: url,
          FITNESS_EXPECT_SUPABASE_HOST: new URL(url).host.toLowerCase(),
        },
      }), /legacy Fitness Supabase project is retired/);
    }
  }
});

test("explicit local emulator target and production-file opt-in remain supported", () => {
  assert.doesNotThrow(() => assertExpectedFitnessSupabaseHost({
    env: { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", FITNESS_EXPECT_SUPABASE_HOST: "127.0.0.1:54321" },
  }));
  const production = { env: { ALLOW_PROD_SUPABASE_IN_DEV: "0" }, envFilePath: "fixture.production.env", commandName: "fixture" };
  assert.throws(() => assertSafeLocalSupabaseDev(production), /Refusing to start/);
  assert.doesNotThrow(() => assertSafeLocalSupabaseDev({ ...production, env: { ALLOW_PROD_SUPABASE_IN_DEV: "1" } }));
});

test("dev startup guards run before spawning and no longer recommend the retired launcher", () => {
  const dev = fs.readFileSync(new URL("./dev.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(dev, /npm run dev:fitness:lps/);
  const spawnIndex = dev.indexOf("const child = spawn(");
  assert.ok(spawnIndex >= 0);
  for (const call of ["assertSafeLocalSupabaseDev({", "assertExpectedFitnessSupabaseHost({"]) {
    const guardIndex = dev.indexOf(call);
    assert.ok(guardIndex >= 0 && guardIndex < spawnIndex);
  }
});

test("mergeEnvFileWithShell preserves shell values for default env files", () => {
  assert.deepEqual(
    mergeEnvFileWithShell({
      fileEnv: {
        SUPABASE_URL: "file-url",
        SUPABASE_SERVICE_ROLE_KEY: "file-key",
      },
      shellEnv: {
        SUPABASE_URL: "shell-url",
      },
    }),
    {
      SUPABASE_URL: "shell-url",
      SUPABASE_SERVICE_ROLE_KEY: "file-key",
    },
  );
});

test("mergeEnvFileWithShell lets an explicit FITNESS_ENV_FILE override shell values", () => {
  assert.deepEqual(
    mergeEnvFileWithShell({
      fileEnv: {
        SUPABASE_URL: "file-url",
        SUPABASE_SERVICE_ROLE_KEY: "file-key",
      },
      shellEnv: {
        FITNESS_ENV_FILE: "operator.env",
        SUPABASE_URL: "shell-url",
        SUPABASE_SERVICE_ROLE_KEY: "shell-key",
      },
    }),
    {
      FITNESS_ENV_FILE: "operator.env",
      SUPABASE_URL: "file-url",
      SUPABASE_SERVICE_ROLE_KEY: "file-key",
    },
  );
});
