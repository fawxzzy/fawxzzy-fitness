import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  getMigrationHistoryDrift,
  parseDryRunJson,
  parseMigrationListJson,
  validateSupabaseChain,
} from "./validate-supabase-chain.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const workflowPath = path.join(
  repoRoot,
  ".github",
  "workflows",
  "planning-persistence-adapter-contract.yml",
);
const LIST_ARGS = [
  "supabase",
  "migration",
  "list",
  "--linked",
  "--output-format",
  "json",
];
const DRY_RUN_ARGS = [
  "supabase",
  "db",
  "push",
  "--dry-run",
  "--linked",
  "--output-format",
  "json",
];

function commandResult(value, status = 0) {
  const stdout = typeof value === "string" ? value : JSON.stringify(value);
  return {
    status,
    stdout,
    stderr: "",
    combined: stdout,
  };
}

function listOutput(migrations) {
  return {
    migrations,
    message: "Migrations listed",
  };
}

function matchedRow(version, time = version) {
  return {
    local: version,
    remote: version,
    time,
  };
}

function dryRunOutput({
  upToDate,
  migrations = [],
  seeds = [],
  roles = [],
  dryRun = true,
} = {}) {
  return {
    upToDate,
    dryRun,
    migrations,
    seeds,
    roles,
    message: upToDate ? "Remote database is up to date." : "Finished supabase db push.",
  };
}

function createLogger() {
  const lines = [];
  return {
    logger: {
      error: (message) => lines.push(`error:${message}`),
      log: (message) => lines.push(`log:${message}`),
    },
    lines,
  };
}

test("migration-list JSON accepts matched history and exposes local/remote-only drift", () => {
  const parsed = parseMigrationListJson(JSON.stringify(listOutput([
    matchedRow("001"),
    matchedRow("021"),
    matchedRow("0221"),
    matchedRow("0222"),
    matchedRow("023"),
    matchedRow("20260701174902", "2026-07-01 17:49:02"),
    {
      local: "20260718015422",
      remote: "",
      time: "2026-07-18 01:54:22",
    },
    {
      local: "",
      remote: "20260729000000",
      time: "2026-07-29 00:00:00",
    },
  ])));

  assert.deepEqual(parsed.mismatches, [
    { local: "20260718015422", remote: "<missing>" },
    { local: "<missing>", remote: "20260729000000" },
  ]);
});

test("migration-list JSON fails closed on malformed, unknown, duplicate, and contradictory output", () => {
  assert.throws(() => parseMigrationListJson("{"), /valid JSON/u);
  assert.throws(
    () => parseMigrationListJson(JSON.stringify({
      ...listOutput([]),
      unexpected: true,
    })),
    /contain exactly/u,
  );
  assert.throws(
    () => parseMigrationListJson(JSON.stringify(listOutput([
      matchedRow("001"),
      matchedRow("001"),
    ]))),
    /duplicate version/u,
  );
  assert.throws(
    () => parseMigrationListJson(JSON.stringify(listOutput([
      {
        local: "001",
        remote: "002",
        time: "001",
      },
    ]))),
    /cannot pair different/u,
  );
});

test("db-push dry-run JSON accepts clean and pending current output", () => {
  assert.deepEqual(
    parseDryRunJson(JSON.stringify(dryRunOutput({ upToDate: true }))).migrations,
    [],
  );
  assert.deepEqual(
    parseDryRunJson(JSON.stringify(dryRunOutput({
      upToDate: false,
      migrations: [
        "20260718015422_retire_human_member_number_compaction.sql",
        "20260729000000_planner_persistence_adapter_v1.sql",
      ],
    }))).migrations,
    [
      "20260718015422_retire_human_member_number_compaction.sql",
      "20260729000000_planner_persistence_adapter_v1.sql",
    ],
  );
});

test("db-push dry-run JSON rejects contradictions, unknown keys, duplicates, and invalid names", () => {
  assert.throws(
    () => parseDryRunJson(JSON.stringify(dryRunOutput({
      upToDate: true,
      migrations: ["20260729000000_planner_persistence_adapter_v1.sql"],
    }))),
    /upToDate must be true exactly/u,
  );
  assert.throws(
    () => parseDryRunJson(JSON.stringify(dryRunOutput({ upToDate: false }))),
    /upToDate must be true exactly/u,
  );
  assert.throws(
    () => parseDryRunJson(JSON.stringify({
      ...dryRunOutput({ upToDate: true }),
      unexpected: true,
    })),
    /contain exactly/u,
  );
  assert.throws(
    () => parseDryRunJson(JSON.stringify(dryRunOutput({
      upToDate: false,
      migrations: [
        "20260729000000_planner_persistence_adapter_v1.sql",
        "20260729000000_planner_persistence_adapter_v1.sql",
      ],
    }))),
    /must not contain duplicates/u,
  );
  assert.throws(
    () => parseDryRunJson(JSON.stringify(dryRunOutput({
      upToDate: false,
      migrations: ["../../secret.txt"],
    }))),
    /is not recognized/u,
  );
  assert.throws(
    () => parseDryRunJson(JSON.stringify(dryRunOutput({
      upToDate: false,
      dryRun: false,
      migrations: ["20260729000000_planner_persistence_adapter_v1.sql"],
    }))),
    /dryRun=true/u,
  );
});

test("history drift uses explicit JSON arguments and never invokes a real provider", () => {
  const calls = [];
  const result = getMigrationHistoryDrift({
    runCommand: (args) => {
      calls.push(args);
      return commandResult(listOutput([
        matchedRow("001"),
        {
          local: "20260729000000",
          remote: "",
          time: "2026-07-29 00:00:00",
        },
      ]));
    },
  });

  assert.deepEqual(calls, [LIST_ARGS]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.mismatches, [
    { local: "20260729000000", remote: "<missing>" },
  ]);
});

test("validator stops on migration drift before any dry-run request", () => {
  const calls = [];
  const { logger, lines } = createLogger();
  const exitCode = validateSupabaseChain({
    logger,
    runCommand: (args) => {
      calls.push(args);
      return commandResult(listOutput([
        {
          local: "20260729000000",
          remote: "",
          time: "2026-07-29 00:00:00",
        },
      ]));
    },
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(calls, [LIST_ARGS]);
  assert(lines.includes("error:- local 20260729000000 | remote <missing>"));
});

test("validator accepts only a matched history and an up-to-date JSON dry run", () => {
  const calls = [];
  const { logger, lines } = createLogger();
  const exitCode = validateSupabaseChain({
    logger,
    runCommand: (args) => {
      calls.push(args);
      if (calls.length === 1) {
        return commandResult(listOutput([matchedRow("001")]));
      }
      return commandResult(dryRunOutput({ upToDate: true }));
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(calls, [LIST_ARGS, DRY_RUN_ARGS]);
  assert.deepEqual(lines, [
    "log:supabase migration history is clean and db push --dry-run reports no pending migrations.",
  ]);
});

test("validator reports pending migrations deterministically from injected JSON", () => {
  const calls = [];
  const { logger, lines } = createLogger();
  const exitCode = validateSupabaseChain({
    logger,
    runCommand: (args) => {
      calls.push(args);
      if (calls.length === 1) {
        return commandResult(listOutput([matchedRow("001")]));
      }
      return commandResult(dryRunOutput({
        upToDate: false,
        migrations: [
          "20260718015422_retire_human_member_number_compaction.sql",
          "20260729000000_planner_persistence_adapter_v1.sql",
        ],
      }));
    },
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(calls, [LIST_ARGS, DRY_RUN_ARGS]);
  assert(lines.includes(
    "error:- 20260718015422_retire_human_member_number_compaction.sql",
  ));
  assert(lines.includes(
    "error:- 20260729000000_planner_persistence_adapter_v1.sql",
  ));
});

test("validator fails closed without echoing malformed or failed command output", () => {
  const secret = "postgres://user:password@example.invalid/database";
  const malformedLog = createLogger();
  const malformedExit = validateSupabaseChain({
    logger: malformedLog.logger,
    runCommand: () => commandResult(`not-json ${secret}`),
  });
  assert.equal(malformedExit, 1);
  assert.equal(malformedLog.lines.join("\n").includes(secret), false);

  const failedLog = createLogger();
  const failedExit = validateSupabaseChain({
    logger: failedLog.logger,
    runCommand: () => commandResult(secret, 2),
  });
  assert.equal(failedExit, 2);
  assert.equal(failedLog.lines.join("\n").includes(secret), false);
});

test("dedicated workflow watches both validator paths and runs this suite directly", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  assert.equal(
    workflow.match(/scripts\/migration\/validate-supabase-chain\.mjs/g)?.length,
    2,
  );
  assert.equal(
    workflow.match(/scripts\/migration\/validate-supabase-chain\.test\.mjs/g)?.length,
    3,
  );
  assert(
    workflow.includes("node --test scripts/migration/validate-supabase-chain.test.mjs"),
  );
});
