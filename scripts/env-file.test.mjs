import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertExpectedFitnessSupabaseHost,
  normalizeEnvValue,
  resolveEnvFilePaths,
} from "./env-file.mjs";

test("normalizeEnvValue strips wrapping quotes bom and escaped trailing newlines", () => {
  assert.equal(
    normalizeEnvValue("\"\uFEFF1508144612957622313\\r\\n\""),
    "1508144612957622313",
  );
});

test("resolveEnvFilePaths prefers the shared env file that matches the expected Fitness Supabase host", () => {
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

  const [first, second] = resolveEnvFilePaths(repoRoot);

  assert.equal(path.basename(first), "fitness-lps-dev.env");
  assert.equal(path.basename(second), "fitness-doctor.env");
});

test("assertExpectedFitnessSupabaseHost fails with a clear mismatch error", () => {
  assert.throws(
    () => assertExpectedFitnessSupabaseHost({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://hcjbdxrekkbfbngrfvcv.supabase.co",
      },
      commandName: "feedback board export",
    }),
    /Expected lpswxoyfniocuhljgzbc\.supabase\.co, received hcjbdxrekkbfbngrfvcv\.supabase\.co/,
  );
});
