import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildChangelogSection,
  parseLedgerLines,
  prepareFitnessRelease,
  recordFitnessRelease,
  RELEASE_CHANGELOG_PATH,
  RELEASE_DRAFT_PATH,
  RELEASE_LEDGER_PATH,
  RELEASE_TEMPLATE_PATH,
} from "./fitness-release-note.mjs";

function createTempRepoRoot() {
  return mkdtempSync(path.join(tmpdir(), "fitness-release-ledger-"));
}

async function seedRepoFiles(repoRoot, { ledgerLines = "", metadata = null } = {}) {
  await fsp.mkdir(path.join(repoRoot, "docs", "releases", "templates"), { recursive: true });
  await fsp.mkdir(path.join(repoRoot, "docs", "releases", "fitness"), { recursive: true });
  await fsp.writeFile(
    path.join(repoRoot, RELEASE_TEMPLATE_PATH),
    "# Fitness Release: {{VERSION}}\n\n## Summary\n\n{{SUMMARY}}\n\n## Changed Areas\n\n{{CHANGED_AREAS}}\n\n## User-facing changes\n\n{{USER_FACING_CHANGES}}\n\n## Verification\n\n{{VERIFICATION}}\n",
    "utf8",
  );
  await fsp.writeFile(path.join(repoRoot, RELEASE_LEDGER_PATH), ledgerLines, "utf8");

  if (metadata) {
    await fsp.mkdir(path.join(repoRoot, "runtime", "fitness"), { recursive: true });
    await fsp.writeFile(path.join(repoRoot, RELEASE_DRAFT_PATH), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  }
}

function createGitStub(overrides = {}) {
  return {
    branch: () => "codex/fit-02-target-hints",
    head: () => "abc123",
    diffNames: () => [],
    headCommitFiles: () => [
      "src/app/api/account/export/route.ts",
      "src/components/settings/DataSettingsSection.tsx",
      "supabase/migrations/20260509103000_profile_qa_visibility.sql",
    ],
    ...overrides,
  };
}

test("empty ledger creates the first release draft and metadata file", async () => {
  const repoRoot = createTempRepoRoot();
  await seedRepoFiles(repoRoot);

  const result = await prepareFitnessRelease({
    repoRoot,
    now: new Date("2026-05-09T06:42:24Z"),
    git: createGitStub(),
  });

  const metadataPath = path.join(repoRoot, RELEASE_DRAFT_PATH);
  const notePath = result.notePath;

  assert.equal(result.version, "fitness-2026.05.09-1");
  assert.equal(fs.existsSync(metadataPath), true);
  assert.equal(fs.existsSync(notePath), true);

  const draft = JSON.parse(await fsp.readFile(metadataPath, "utf8"));
  assert.equal(draft.version, "fitness-2026.05.09-1");
  assert.match(draft.summary, /TODO:/);
});

test("previous release diff uses the prior ledger commit and groups changed files by area", async () => {
  const repoRoot = createTempRepoRoot();
  await seedRepoFiles(repoRoot, {
    ledgerLines: `${JSON.stringify({
      version: "fitness-2026.05.08-1",
      app: "fitness",
      environment: "production",
      commit: "prev456",
    })}\n`,
    metadata: {
      version: "fitness-2026.05.09-1",
      summary: "Wave 1 shipped.",
      lanes: ["FIT-03", "FIT-04"],
      userFacingChanges: ["Added export."],
      verification: ["npm run verify"],
      deploymentUrl: "https://deploy.example.com",
      prodUrl: "https://fitness.example.com",
      author: "Codex",
    },
  });

  const result = await prepareFitnessRelease({
    repoRoot,
    now: new Date("2026-05-09T06:42:24Z"),
    git: createGitStub({
      diffNames: (baseCommit, headCommit) => {
        assert.equal(baseCommit, "prev456");
        assert.equal(headCommit, "abc123");
        return [
          "src/app/api/account/export/route.ts",
          "scripts/qa/open-fitness-llel-tabs.mjs",
          "supabase/migrations/20260509103000_profile_qa_visibility.sql",
        ];
      },
    }),
  });

  assert.equal(result.previousCommit, "prev456");
  assert.deepEqual(Object.keys(result.changedAreas).sort(), ["Account/Data", "Migrations", "QA/LLEL"]);
});

test("record appends valid JSONL ledger entries", async () => {
  const repoRoot = createTempRepoRoot();
  await seedRepoFiles(repoRoot, {
    metadata: {
      version: "fitness-2026.05.09-1",
      summary: "Wave 1 shipped.",
      lanes: ["FIT-03", "FIT-04"],
      userFacingChanges: ["Added account export."],
      internalChanges: ["Added release ledger support."],
      verification: ["npm run typecheck", "npm run verify"],
      artifacts: ["runtime/fitness/llel-captures/2026-05-09-06-42-47"],
      knownGaps: ["Authenticated capture can expire."],
      deploymentUrl: "https://deploy.example.com",
      prodUrl: "https://fitness.example.com",
      author: "Codex",
      source: "runtime/fitness/release-draft.json",
    },
  });

  await recordFitnessRelease({
    repoRoot,
    now: new Date("2026-05-09T06:42:24Z"),
    git: createGitStub(),
  });

  const ledgerRaw = await fsp.readFile(path.join(repoRoot, RELEASE_LEDGER_PATH), "utf8");
  const entries = parseLedgerLines(ledgerRaw);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].version, "fitness-2026.05.09-1");
  assert.equal(entries[0].deploymentUrl, "https://deploy.example.com");
});

test("record fails when required fields are missing", async () => {
  const repoRoot = createTempRepoRoot();
  await seedRepoFiles(repoRoot, {
    metadata: {
      version: "fitness-2026.05.09-1",
      summary: "TODO: add summary",
      lanes: [],
      userFacingChanges: [],
      verification: [],
      deploymentUrl: "",
      prodUrl: "",
      author: "",
    },
  });

  await assert.rejects(
    () => recordFitnessRelease({
      repoRoot,
      now: new Date("2026-05-09T06:42:24Z"),
      git: createGitStub(),
    }),
    /Release record validation failed/,
  );
});

test("record appends a user-facing changelog section", async () => {
  const repoRoot = createTempRepoRoot();
  await seedRepoFiles(repoRoot, {
    metadata: {
      version: "fitness-2026.05.09-1",
      summary: "Wave 1 shipped.",
      lanes: ["FIT-03", "FIT-04"],
      userFacingChanges: ["Added account export.", "Added QA visibility toggle."],
      verification: ["npm run verify"],
      deploymentUrl: "https://deploy.example.com",
      prodUrl: "https://fitness.example.com",
      author: "Codex",
    },
  });

  const result = await recordFitnessRelease({
    repoRoot,
    now: new Date("2026-05-09T06:42:24Z"),
    git: createGitStub(),
  });

  const changelogPath = path.join(repoRoot, RELEASE_CHANGELOG_PATH);
  const changelog = await fsp.readFile(changelogPath, "utf8");

  assert.match(changelog, /# Changelog/);
  assert.match(changelog, /## fitness-2026\.05\.09-1 - 2026-05-09/);
  assert.match(changelog, /Added account export\./);

  const expectedSection = buildChangelogSection({
    context: result.ledgerEntry,
    notePath: result.notePath,
    repoRoot,
  });
  assert.match(changelog, new RegExp(expectedSection.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
