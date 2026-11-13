// Aggregate test runner: runs every `*.test.{ts,tsx,mjs,js}` file in the repo through the Node test
// runner with the test alias loader, so a new test file is picked up without being named in a
// package.json script or a workflow. A file is skipped only when it is listed in
// `scripts/test-all.exclusions.json` with a reason (see `scripts/test-all.test.mjs`).
//
//   node scripts/test-all.mjs            run everything that is not excluded
//   node scripts/test-all.mjs --list     print the files that would run
//   node scripts/test-all.mjs --excluded print the excluded files with their reasons
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEST_FILE_PATTERN = /\.test\.(ts|tsx|mjs|js)$/u;
const BATCH_SIZE = 40;

export function listTestFiles(root = repoRoot) {
  // Tracked plus new untracked files, so a test added in the working tree is included before commit.
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return output
    .split("\0")
    .filter((file) => TEST_FILE_PATTERN.test(file) && fs.existsSync(path.join(root, file)))
    .sort();
}

export function loadExclusions(root = repoRoot) {
  const raw = JSON.parse(fs.readFileSync(path.join(root, "scripts", "test-all.exclusions.json"), "utf8"));
  return raw.exclusions;
}

export function partitionTestFiles(files, exclusions) {
  const excludedPaths = new Set(exclusions.map((entry) => entry.path));
  return {
    run: files.filter((file) => !excludedPaths.has(file)),
    excluded: files.filter((file) => excludedPaths.has(file)),
  };
}

function main(argv) {
  const files = listTestFiles();
  const exclusions = loadExclusions();
  const { run, excluded } = partitionTestFiles(files, exclusions);

  if (argv.includes("--list")) {
    console.log(run.join("\n"));
    return 0;
  }
  if (argv.includes("--excluded")) {
    for (const entry of exclusions) {
      console.log(`${entry.path}\n    ${entry.reason}`);
    }
    return 0;
  }

  console.log(`[test-all] ${run.length} test files to run, ${excluded.length} excluded (scripts/test-all.exclusions.json)`);
  let failedBatches = 0;
  for (let index = 0; index < run.length; index += BATCH_SIZE) {
    const batch = run.slice(index, index + BATCH_SIZE);
    const result = spawnSync(
      process.execPath,
      ["--import", "./scripts/register-test-aliases.mjs", "--test", "--test-reporter=spec", ...batch],
      { cwd: repoRoot, stdio: "inherit" },
    );
    if (result.status !== 0) {
      failedBatches += 1;
      console.error(`[test-all] batch ${index / BATCH_SIZE + 1} failed (files ${index + 1}-${index + batch.length})`);
    }
  }

  if (failedBatches > 0) {
    console.error(`[test-all] FAILED: ${failedBatches} batch(es) had failing tests`);
    return 1;
  }
  console.log("[test-all] all included test files passed");
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
