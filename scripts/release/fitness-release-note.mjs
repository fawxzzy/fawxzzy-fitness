import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const defaultRepoRoot = path.resolve(currentDir, "..", "..");

export const RELEASE_LEDGER_PATH = "docs/releases/RELEASE_LEDGER.jsonl";
export const RELEASE_TEMPLATE_PATH = "docs/releases/templates/fitness-release-note.md";
export const RELEASE_NOTES_ROOT = "docs/releases/fitness";
export const RELEASE_DRAFT_PATH = "runtime/fitness/release-draft.json";
export const RELEASE_CHANGELOG_PATH = "CHANGELOG.md";

const DEFAULT_APP = "fitness";
const DEFAULT_ENVIRONMENT = "production";
const DEFAULT_TEMPLATE = `# Fitness Release: {{VERSION}}

## Summary

{{SUMMARY}}

## Release Facts

- App: {{APP}}
- Environment: {{ENVIRONMENT}}
- Branch: \`{{BRANCH}}\`
- Commit: \`{{COMMIT}}\`
- Previous commit: {{PREVIOUS_COMMIT}}
- Deployed at: {{DEPLOYED_AT}}
- Production URL: {{PROD_URL}}
- Deployment URL: {{DEPLOYMENT_URL}}

## Lanes

{{LANES}}

## User-facing changes

{{USER_FACING_CHANGES}}

## Internal changes

{{INTERNAL_CHANGES}}

## Changed Areas

{{CHANGED_AREAS}}

## Verification

{{VERIFICATION}}

## Migrations

{{MIGRATIONS}}

## Feature flags

{{FEATURE_FLAGS}}

## Artifacts

{{ARTIFACTS}}

## Known gaps

{{KNOWN_GAPS}}
`;

const RELEASE_AREA_RULES = [
  {
    area: "Account/Data",
    matchers: [
      "src/app/api/account/",
      "src/app/settings/",
      "src/components/settings/",
      "src/lib/account-workout-export",
      "src/lib/profile-core",
    ],
  },
  {
    area: "Progression",
    matchers: [
      "src/app/progression-review/",
      "src/app/dev/progression-",
      "src/components/progression/",
      "src/components/routines/Progression",
      "src/components/routines/TrainingGoalSelector",
      "src/lib/progression-",
      "src/lib/set-flow",
      "src/lib/exercise-goal-format",
    ],
  },
  {
    area: "Routine Builder",
    matchers: [
      "src/app/routines/",
      "src/components/routines/",
      "src/lib/routines",
      "src/lib/routine-",
      "src/lib/edit-day-",
    ],
  },
  {
    area: "Today",
    matchers: [
      "src/app/today/",
      "src/components/today/",
      "src/lib/today-",
    ],
  },
  {
    area: "Current Session",
    matchers: [
      "src/app/session/",
      "src/components/session/",
      "src/components/Session",
      "src/lib/session-",
      "src/lib/live-set-input-order",
    ],
  },
  {
    area: "History",
    matchers: [
      "src/app/history/",
      "src/components/history/",
      "src/lib/history-",
    ],
  },
  {
    area: "QA/LLEL",
    matchers: [
      "scripts/qa/",
      "src/lib/qa-data-visibility",
      "src/app/dev/mobile-regression/",
      "src/features/mobile-regression/",
      "tests/mobile-regression/",
      "src/app/dev/env/",
      "src/app/dev/flags/",
    ],
  },
  {
    area: "Backend/Follow-ups",
    matchers: [
      "scripts/process-fitness-followups",
      "src/lib/session-follow-up-jobs",
      "src/app/actions/",
      "supabase/seed.sql",
    ],
  },
  {
    area: "Feature Flags",
    matchers: [
      "src/lib/feature-flags",
      "src/app/dev/flags/",
    ],
  },
  {
    area: "Recap",
    matchers: [
      "src/lib/workout-recap",
      "src/components/history/WeeklyProgressSurface",
    ],
  },
  {
    area: "Migrations",
    matchers: [
      "supabase/migrations/",
    ],
  },
  {
    area: "Docs",
    matchers: [
      "docs/",
      "README",
      "CHANGELOG.md",
    ],
  },
];

function normalizeRepoPath(value) {
  return String(value).replace(/\\/g, "/");
}

function toIsoString(date) {
  return new Date(date).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function formatCalendarDate(date) {
  const value = new Date(date);
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatVersionDate(date) {
  return formatCalendarDate(date).replace(/-/g, ".");
}

function splitLines(raw) {
  return String(raw)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mergeUniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0).map((value) => value.trim()))];
}

function isPlaceholderString(value) {
  return typeof value !== "string"
    || value.trim().length === 0
    || /^todo[:\s-]/i.test(value.trim())
    || /fill in/i.test(value);
}

function formatMarkdownBulletList(items, emptyText = "- None recorded.") {
  if (!Array.isArray(items) || items.length === 0) {
    return emptyText;
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function formatFeatureFlagsMarkdown(flags) {
  if (!flags || typeof flags !== "object" || Array.isArray(flags) || Object.keys(flags).length === 0) {
    return "- None recorded.";
  }

  return Object.entries(flags)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `- \`${key}\`: \`${JSON.stringify(value)}\``)
    .join("\n");
}

function formatChangedAreasMarkdown(changedAreas) {
  const entries = Object.entries(changedAreas).filter(([, files]) => Array.isArray(files) && files.length > 0);
  if (entries.length === 0) {
    return "- No diff range is available yet for this recorded release baseline.";
  }

  return entries
    .map(([area, files]) => `- ${area}: ${files.length} file${files.length === 1 ? "" : "s"} changed`)
    .join("\n");
}

function renderTemplate(template, replacements) {
  return Object.entries(replacements).reduce(
    (output, [token, value]) => output.replace(new RegExp(`{{${escapeRegExp(token)}}}`, "g"), value),
    template,
  );
}

function buildDefaultDraft({ now, app, ledgerEntries, metadataPath, repoRoot }) {
  return {
    app,
    environment: DEFAULT_ENVIRONMENT,
    version: buildGeneratedVersion({ app, date: now, ledgerEntries }),
    summary: "TODO: Summarize the production push in one paragraph.",
    lanes: ["TODO: Add FIT lane ids included in this production push."],
    userFacingChanges: ["TODO: Add at least one user-facing change."],
    internalChanges: ["TODO: Add internal implementation notes if relevant."],
    verification: [
      "npm run typecheck",
      "npm run verify",
    ],
    artifacts: ["TODO: Add screenshots, QA capture folders, or acceptance packages."],
    knownGaps: ["TODO: Record any known product, QA, or ops gaps that remain after release."],
    featureFlags: {},
    previousCommit: "",
    deploymentUrl: "",
    prodUrl: "",
    deployedAt: "",
    author: process.env.USERNAME || process.env.USER || "TODO: release owner",
    source: normalizeRepoPath(path.relative(repoRoot, metadataPath)),
    migrations: [],
  };
}

export function buildGeneratedVersion({ app = DEFAULT_APP, date = new Date(), ledgerEntries = [] }) {
  const versionDate = formatVersionDate(date);
  const versionPattern = new RegExp(`^${escapeRegExp(app)}-${escapeRegExp(versionDate)}-(\\d+)$`);
  const ordinals = ledgerEntries
    .map((entry) => {
      const match = versionPattern.exec(entry?.version ?? "");
      return match ? Number.parseInt(match[1], 10) : null;
    })
    .filter((value) => Number.isInteger(value));

  const nextOrdinal = ordinals.length === 0 ? 1 : Math.max(...ordinals) + 1;
  return `${app}-${versionDate}-${nextOrdinal}`;
}

export function groupChangedFiles(files) {
  const grouped = Object.fromEntries(RELEASE_AREA_RULES.map(({ area }) => [area, []]));
  grouped.Other = [];

  for (const inputFile of files) {
    const file = normalizeRepoPath(inputFile);
    const matchedArea = RELEASE_AREA_RULES.find(({ matchers }) => matchers.some((matcher) => file.startsWith(matcher)));
    grouped[matchedArea?.area ?? "Other"].push(file);
  }

  return Object.fromEntries(
    Object.entries(grouped)
      .filter(([, areaFiles]) => areaFiles.length > 0)
      .map(([area, areaFiles]) => [area, areaFiles.sort((left, right) => left.localeCompare(right))]),
  );
}

export function extractMigrationsFromFiles(files) {
  return files
    .filter((file) => normalizeRepoPath(file).startsWith("supabase/migrations/"))
    .map((file) => path.basename(file, ".sql"))
    .sort((left, right) => left.localeCompare(right));
}

export function parseLedgerLines(raw) {
  const lines = splitLines(raw);
  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSON in release ledger at line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function ensureParentDirectory(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readLedgerEntries(ledgerPath) {
  try {
    const raw = await fs.readFile(ledgerPath, "utf8");
    if (raw.trim().length === 0) {
      return [];
    }

    return parseLedgerLines(raw);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function loadReleaseTemplate(templatePath) {
  try {
    return await fs.readFile(templatePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return DEFAULT_TEMPLATE;
    }

    throw error;
  }
}

async function ensureDraftMetadata({ metadataPath, ledgerEntries, now, app, repoRoot }) {
  try {
    const existing = await readJsonFile(metadataPath);
    return existing;
  } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  const initialDraft = buildDefaultDraft({
    now,
    app,
    ledgerEntries,
    metadataPath,
    repoRoot,
  });
  await ensureParentDirectory(metadataPath);
  await fs.writeFile(metadataPath, `${JSON.stringify(initialDraft, null, 2)}\n`, "utf8");
  return initialDraft;
}

function createGitClient(repoRoot) {
  function runGit(args) {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  }

  return {
    branch() {
      return runGit(["branch", "--show-current"]);
    },
    head() {
      return runGit(["rev-parse", "HEAD"]);
    },
    diffNames(baseCommit, headCommit) {
      if (!baseCommit || !headCommit || baseCommit === headCommit) {
        return [];
      }

      return splitLines(runGit(["diff", "--name-only", `${baseCommit}..${headCommit}`]));
    },
    headCommitFiles() {
      return splitLines(runGit(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]));
    },
  };
}

function getLatestLedgerEntry(entries, { app, environment }) {
  return [...entries]
    .reverse()
    .find((entry) => entry?.app === app && entry?.environment === environment) ?? null;
}

function resolveReleaseNotePath({ repoRoot, app, version, date }) {
  const year = String(new Date(date).getUTCFullYear());
  const filename = `${formatCalendarDate(date)}-${app}-${version.replace(new RegExp(`^${escapeRegExp(app)}-`), "")}.md`;
  return path.join(repoRoot, RELEASE_NOTES_ROOT, year, filename);
}

function buildDiffScope({ previousCommit, commit }) {
  if (previousCommit) {
    return `${previousCommit}..${commit}`;
  }

  return `${commit}^!`;
}

function buildReleaseContext({
  repoRoot,
  metadata,
  ledgerEntries,
  git,
  now,
}) {
  const app = metadata.app ?? DEFAULT_APP;
  const environment = metadata.environment ?? DEFAULT_ENVIRONMENT;
  const branch = git.branch();
  const commit = git.head();
  const previousEntry = getLatestLedgerEntry(ledgerEntries, { app, environment });
  const previousCommit = metadata.previousCommit ?? previousEntry?.commit ?? null;
  const version = metadata.version && typeof metadata.version === "string" && metadata.version.trim().length > 0
    ? metadata.version.trim()
    : buildGeneratedVersion({ app, date: now, ledgerEntries });
  const diffFiles = previousCommit ? git.diffNames(previousCommit, commit) : git.headCommitFiles();
  const changedAreas = groupChangedFiles(diffFiles);
  const autoMigrations = extractMigrationsFromFiles(diffFiles);
  const migrations = mergeUniqueStrings([...(metadata.migrations ?? []), ...autoMigrations]);
  const deployedAt = metadata.deployedAt && typeof metadata.deployedAt === "string" && metadata.deployedAt.trim().length > 0
    ? metadata.deployedAt.trim()
    : toIsoString(now);
  const notePath = resolveReleaseNotePath({
    repoRoot,
    app,
    version,
    date: deployedAt,
  });
  const prodUrl = typeof metadata.prodUrl === "string" ? metadata.prodUrl.trim() : "";
  const deploymentUrl = typeof metadata.deploymentUrl === "string" ? metadata.deploymentUrl.trim() : "";
  const source = typeof metadata.source === "string" && metadata.source.trim().length > 0
    ? metadata.source.trim()
    : normalizeRepoPath(path.relative(repoRoot, path.join(repoRoot, RELEASE_DRAFT_PATH)));
  const author = typeof metadata.author === "string" && metadata.author.trim().length > 0
    ? metadata.author.trim()
    : process.env.USERNAME || process.env.USER || "";

  return {
    app,
    environment,
    version,
    branch,
    commit,
    previousCommit,
    deployedAt,
    deploymentUrl,
    prodUrl,
    summary: typeof metadata.summary === "string" && metadata.summary.trim().length > 0
      ? metadata.summary.trim()
      : "TODO: Summarize the production push in one paragraph.",
    lanes: Array.isArray(metadata.lanes) ? metadata.lanes : [],
    userFacingChanges: Array.isArray(metadata.userFacingChanges) ? metadata.userFacingChanges : [],
    internalChanges: Array.isArray(metadata.internalChanges) ? metadata.internalChanges : [],
    migrations,
    featureFlags: metadata.featureFlags && typeof metadata.featureFlags === "object" && !Array.isArray(metadata.featureFlags)
      ? metadata.featureFlags
      : {},
    verification: Array.isArray(metadata.verification) ? metadata.verification : [],
    artifacts: Array.isArray(metadata.artifacts) ? metadata.artifacts : [],
    knownGaps: Array.isArray(metadata.knownGaps) ? metadata.knownGaps : [],
    author,
    source,
    diffRange: buildDiffScope({ previousCommit, commit }),
    changedAreas,
    changedFiles: diffFiles,
    notePath,
    previousVersion: previousEntry?.version ?? null,
  };
}

async function writeReleaseNote({ templatePath, notePath, context }) {
  const template = await loadReleaseTemplate(templatePath);
  const markdown = renderTemplate(template, {
    VERSION: context.version,
    SUMMARY: context.summary,
    APP: context.app,
    ENVIRONMENT: context.environment,
    BRANCH: context.branch,
    COMMIT: context.commit,
    PREVIOUS_COMMIT: context.previousCommit ?? "None recorded yet",
    DEPLOYED_AT: context.deployedAt,
    PROD_URL: context.prodUrl || "TODO: add production URL",
    DEPLOYMENT_URL: context.deploymentUrl || "TODO: add deployment URL",
    LANES: formatMarkdownBulletList(context.lanes, "- No lane taxonomy recorded yet."),
    USER_FACING_CHANGES: formatMarkdownBulletList(context.userFacingChanges),
    INTERNAL_CHANGES: formatMarkdownBulletList(context.internalChanges),
    CHANGED_AREAS: formatChangedAreasMarkdown(context.changedAreas),
    VERIFICATION: formatMarkdownBulletList(context.verification),
    MIGRATIONS: formatMarkdownBulletList(context.migrations),
    FEATURE_FLAGS: formatFeatureFlagsMarkdown(context.featureFlags),
    ARTIFACTS: formatMarkdownBulletList(context.artifacts),
    KNOWN_GAPS: formatMarkdownBulletList(context.knownGaps),
  }).replace(/\r\n/g, "\n");

  await ensureParentDirectory(notePath);
  await fs.writeFile(notePath, `${markdown.trim()}\n`, "utf8");
  return markdown.trim();
}

function validateRecordContext(context) {
  const errors = [];

  if (isPlaceholderString(context.summary)) {
    errors.push("summary must be filled in before recording a release");
  }
  if (!Array.isArray(context.lanes) || context.lanes.length === 0 || context.lanes.some((lane) => isPlaceholderString(lane))) {
    errors.push("lanes must list at least one FIT lane before recording a release");
  }
  if (!Array.isArray(context.userFacingChanges) || context.userFacingChanges.length === 0 || context.userFacingChanges.some((item) => isPlaceholderString(item))) {
    errors.push("userFacingChanges must list at least one concrete change before recording a release");
  }
  if (!Array.isArray(context.verification) || context.verification.length === 0 || context.verification.some((item) => isPlaceholderString(item))) {
    errors.push("verification must list at least one concrete command before recording a release");
  }
  if (isPlaceholderString(context.author)) {
    errors.push("author must be set before recording a release");
  }
  if (isPlaceholderString(context.prodUrl)) {
    errors.push("prodUrl must be set before recording a release");
  }
  if (isPlaceholderString(context.deploymentUrl)) {
    errors.push("deploymentUrl must be set before recording a release");
  }

  return errors;
}

function buildLedgerEntry(context) {
  return {
    version: context.version,
    app: context.app,
    environment: context.environment,
    branch: context.branch,
    commit: context.commit,
    previousCommit: context.previousCommit,
    deployedAt: context.deployedAt,
    prodUrl: context.prodUrl,
    deploymentUrl: context.deploymentUrl,
    lanes: context.lanes,
    userFacingChanges: context.userFacingChanges,
    internalChanges: context.internalChanges,
    migrations: context.migrations,
    featureFlags: context.featureFlags,
    verification: context.verification,
    artifacts: context.artifacts,
    knownGaps: context.knownGaps,
    author: context.author,
    source: context.source,
    diffRange: context.diffRange,
    changedAreas: context.changedAreas,
  };
}

async function appendLedgerEntry(ledgerPath, entry) {
  await ensureParentDirectory(ledgerPath);
  const serialized = JSON.stringify(entry);
  await fs.appendFile(ledgerPath, `${serialized}\n`, "utf8");
}

function buildChangelogHeader() {
  return [
    "# Changelog",
    "",
    "User-facing production release rollup for Fawxzzy Fitness.",
    "Canonical machine-readable release truth lives in `docs/releases/RELEASE_LEDGER.jsonl`.",
    "",
  ].join("\n");
}

export function buildChangelogSection({ context, notePath, repoRoot }) {
  const relativeNotePath = normalizeRepoPath(path.relative(repoRoot, notePath));
  const headingDate = formatCalendarDate(context.deployedAt);
  const lines = [
    `## ${context.version} - ${headingDate}`,
    "",
    ...context.userFacingChanges.map((item) => `- ${item}`),
    `- Release note: [${path.basename(notePath)}](${relativeNotePath})`,
    "",
  ];

  return lines.join("\n");
}

async function appendChangelogEntry(changelogPath, section) {
  let existing = "";
  try {
    existing = await fs.readFile(changelogPath, "utf8");
  } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  const header = buildChangelogHeader();
  const next = existing.trim().length === 0
    ? `${header}${section}`
    : `${existing.trimEnd()}\n\n${section}`;
  await ensureParentDirectory(changelogPath);
  await fs.writeFile(changelogPath, `${next.trimEnd()}\n`, "utf8");
}

export async function prepareFitnessRelease(options = {}) {
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const now = options.now ?? new Date();
  const git = options.git ?? createGitClient(repoRoot);
  const ledgerPath = path.join(repoRoot, options.ledgerPath ?? RELEASE_LEDGER_PATH);
  const templatePath = path.join(repoRoot, options.templatePath ?? RELEASE_TEMPLATE_PATH);
  const metadataPath = path.join(repoRoot, options.metadataPath ?? RELEASE_DRAFT_PATH);
  const ledgerEntries = await readLedgerEntries(ledgerPath);
  const metadata = await ensureDraftMetadata({
    metadataPath,
    ledgerEntries,
    now,
    app: DEFAULT_APP,
    repoRoot,
  });
  const context = buildReleaseContext({
    repoRoot,
    metadata,
    ledgerEntries,
    git,
    now,
  });
  const markdown = await writeReleaseNote({
    templatePath,
    notePath: context.notePath,
    context,
  });

  return {
    command: "prepare",
    version: context.version,
    previousVersion: context.previousVersion,
    commit: context.commit,
    previousCommit: context.previousCommit,
    diffRange: context.diffRange,
    changedAreas: context.changedAreas,
    migrations: context.migrations,
    metadataPath,
    notePath: context.notePath,
    ledgerPath,
    markdown,
  };
}

export async function diffFitnessRelease(options = {}) {
  const prepared = await prepareFitnessRelease(options);
  return {
    command: "diff",
    version: prepared.version,
    previousVersion: prepared.previousVersion,
    commit: prepared.commit,
    previousCommit: prepared.previousCommit,
    diffRange: prepared.diffRange,
    changedAreas: prepared.changedAreas,
    migrations: prepared.migrations,
    metadataPath: prepared.metadataPath,
    notePath: prepared.notePath,
  };
}

export async function recordFitnessRelease(options = {}) {
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const changelogPath = path.join(repoRoot, options.changelogPath ?? RELEASE_CHANGELOG_PATH);
  const prepared = await prepareFitnessRelease(options);
  const ledgerEntries = await readLedgerEntries(prepared.ledgerPath);
  const metadata = await readJsonFile(prepared.metadataPath);
  const git = options.git ?? createGitClient(repoRoot);
  const context = buildReleaseContext({
    repoRoot,
    metadata,
    ledgerEntries,
    git,
    now: options.now ?? new Date(),
  });

  const validationErrors = validateRecordContext(context);
  if (ledgerEntries.some((entry) => entry.version === context.version)) {
    validationErrors.push(`release version ${context.version} already exists in ${normalizeRepoPath(path.relative(repoRoot, prepared.ledgerPath))}`);
  }
  if (validationErrors.length > 0) {
    throw new Error(`Release record validation failed:\n- ${validationErrors.join("\n- ")}`);
  }

  await writeReleaseNote({
    templatePath: path.join(repoRoot, options.templatePath ?? RELEASE_TEMPLATE_PATH),
    notePath: context.notePath,
    context,
  });
  const ledgerEntry = buildLedgerEntry(context);
  await appendLedgerEntry(prepared.ledgerPath, ledgerEntry);
  const changelogSection = buildChangelogSection({
    context,
    notePath: context.notePath,
    repoRoot,
  });
  await appendChangelogEntry(changelogPath, changelogSection);

  return {
    command: "record",
    version: context.version,
    commit: context.commit,
    previousCommit: context.previousCommit,
    diffRange: context.diffRange,
    ledgerPath: prepared.ledgerPath,
    notePath: context.notePath,
    changelogPath,
    ledgerEntry,
  };
}

function parseArgs(argv = process.argv.slice(2)) {
  const [command = "prepare", ...rest] = argv;
  const flags = {};

  for (let index = 0; index < rest.length; index += 1) {
    const part = rest[index];
    if (!part.startsWith("--")) {
      continue;
    }

    const key = part.slice(2);
    const next = rest[index + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      index += 1;
      continue;
    }

    flags[key] = true;
  }

  return {
    command,
    flags,
  };
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  const repoRoot = flags["repo-root"] ? path.resolve(String(flags["repo-root"])) : defaultRepoRoot;
  const sharedOptions = {
    repoRoot,
    metadataPath: flags["metadata-path"] ? String(flags["metadata-path"]) : RELEASE_DRAFT_PATH,
    ledgerPath: flags["ledger-path"] ? String(flags["ledger-path"]) : RELEASE_LEDGER_PATH,
    templatePath: flags["template-path"] ? String(flags["template-path"]) : RELEASE_TEMPLATE_PATH,
    changelogPath: flags["changelog-path"] ? String(flags["changelog-path"]) : RELEASE_CHANGELOG_PATH,
  };

  let result;
  if (command === "prepare") {
    result = await prepareFitnessRelease(sharedOptions);
  } else if (command === "diff") {
    result = await diffFitnessRelease(sharedOptions);
  } else if (command === "record") {
    result = await recordFitnessRelease(sharedOptions);
  } else {
    throw new Error(`Unsupported command "${command}". Expected prepare, diff, or record.`);
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
