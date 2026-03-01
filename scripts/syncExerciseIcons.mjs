import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const DEFAULT_ICONS_DIR = path.resolve(rootDir, "public/exercises/icons");
const DEFAULT_REPORT_PATH = path.resolve(rootDir, "icon-sync-report.md");
const DEFAULT_BACKFILL_REPORT_PATH = path.resolve(rootDir, "icon-missing-backfill-report.md");
const MANIFEST_PATH = path.resolve(rootDir, "src/generated/exerciseIconManifest.ts");
const MIGRATIONS_DIR = path.resolve(rootDir, "supabase/migrations");

const VALID_ICON_FILE_RE = /^[a-z0-9-]+\.(png|webp)$/;
const SUGGESTED_SLUG_RE = /[^a-z0-9-]+/g;
const IMAGE_EXTENSIONS = new Set([".png", ".webp", ".svg", ".jpg", ".jpeg", ".gif", ".avif"]);
const SUPPORTED_ICON_EXTENSIONS = new Set([".png", ".webp"]);
const DEFAULT_STAGING_CANDIDATES = [
  "NewExerciseIcons",
  "new-exercise-icons",
  "exercise-icons",
  "public/exercise-icons",
  "assets/exercise-icons",
];

function slugifyExerciseName(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseArgs(argv) {
  const options = {
    mode: "sync",
    iconsDir: DEFAULT_ICONS_DIR,
    reportPath: DEFAULT_REPORT_PATH,
    apply: false,
    stagingDirs: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--mode" && argv[index + 1]) {
      options.mode = argv[index + 1].trim();
      index += 1;
      continue;
    }

    if (arg === "--iconsDir" && argv[index + 1]) {
      options.iconsDir = path.resolve(rootDir, argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--reportPath" && argv[index + 1]) {
      options.reportPath = path.resolve(rootDir, argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--stagingDir" && argv[index + 1]) {
      const value = argv[index + 1]
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => path.resolve(rootDir, part));
      options.stagingDirs.push(...value);
      index += 1;
      continue;
    }

    if (arg === "--apply") {
      options.apply = true;
    }
  }

  if (options.mode === "missing-backfill" && options.reportPath === DEFAULT_REPORT_PATH) {
    options.reportPath = DEFAULT_BACKFILL_REPORT_PATH;
  }

  return options;
}

function parseManifestMap(content) {
  const recordMatch = content.match(/export const EXERCISE_ICON_EXT_BY_SLUG:[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  if (!recordMatch) {
    return new Map();
  }

  const map = new Map();
  const lineMatches = [...recordMatch[1].matchAll(/\s*"([^"]+)":\s*"([^"]+)",/g)];
  for (const [, slug, extension] of lineMatches) {
    map.set(slug, extension);
  }

  return map;
}

function toSuggestedSlug(baseName) {
  return baseName
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(SUGGESTED_SLUG_RE, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatIsoDate(stat) {
  return new Date(stat.mtimeMs).toISOString();
}

function formatIconLine(icon) {
  return `- ${icon.slug} (${icon.extension}, ${icon.size} bytes, mtime: ${icon.mtimeIso})`;
}

async function readIconFiles(iconsDir) {
  const entries = await fs.readdir(iconsDir, { withFileTypes: true });
  const iconFileNames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => {
      const ext = path.extname(fileName).toLowerCase();
      return ext === ".png" || ext === ".webp";
    })
    .sort((a, b) => a.localeCompare(b));

  const validIcons = [];
  const invalidIcons = [];

  for (const fileName of iconFileNames) {
    const fullPath = path.join(iconsDir, fileName);
    const stat = await fs.stat(fullPath);
    const extension = path.extname(fileName).slice(1).toLowerCase();
    const baseName = path.basename(fileName, path.extname(fileName));

    if (!VALID_ICON_FILE_RE.test(fileName)) {
      const suggestedSlug = toSuggestedSlug(baseName);
      invalidIcons.push({
        fileName,
        suggested: suggestedSlug ? `${suggestedSlug}.${extension}` : null,
      });
      continue;
    }

    validIcons.push({
      fileName,
      slug: baseName,
      extension,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      mtimeIso: formatIsoDate(stat),
    });
  }

  return {
    validIcons: validIcons.sort((a, b) => a.slug.localeCompare(b.slug)),
    invalidIcons: invalidIcons.sort((a, b) => a.fileName.localeCompare(b.fileName)),
    totalScanned: iconFileNames.length,
  };
}

function diffIcons(validIcons, previousManifestMap) {
  const newIcons = [];
  const changedIcons = [];

  for (const icon of validIcons) {
    const previousExtension = previousManifestMap.get(icon.slug);
    if (!previousExtension) {
      newIcons.push(icon);
      continue;
    }

    if (previousExtension !== icon.extension) {
      changedIcons.push(icon);
    }
  }

  return {
    newIcons,
    changedIcons,
  };
}

async function regenerateManifestIfPresent(manifestPath) {
  try {
    await fs.access(manifestPath);
  } catch {
    return false;
  }

  await import("./generate-exercise-icon-manifest.mjs");
  return true;
}

function buildReport({
  iconsDir,
  manifestRegenerated,
  totalScanned,
  validIcons,
  invalidIcons,
  newIcons,
  changedIcons,
}) {
  const lines = [];

  lines.push("# Exercise Icon Sync Report");
  lines.push("");
  lines.push("Run `npm run sync:exercise-icons` after adding correctly named icons to the canonical icon directory.");
  lines.push(`Default icon directory: \`${path.relative(rootDir, iconsDir) || "."}\`.`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total icons scanned: ${totalScanned}`);
  lines.push(`- Valid icons: ${validIcons.length}`);
  lines.push(`- Invalid filenames: ${invalidIcons.length}`);
  lines.push(`- New icons: ${newIcons.length}`);
  lines.push(`- Changed icons: ${changedIcons.length}`);
  lines.push("- Orphan icons: N/A (no canonical catalog source found)");
  lines.push("- Missing icons: N/A (no canonical catalog source found)");
  lines.push(`- Manifest regenerated: ${manifestRegenerated ? "yes" : "no (no existing manifest found)"}`);

  lines.push("");
  lines.push("## NEW ICONS");
  lines.push("");
  if (newIcons.length === 0) {
    lines.push("- None");
  } else {
    for (const icon of newIcons) {
      lines.push(formatIconLine(icon));
    }
  }

  lines.push("");
  lines.push("## CHANGED ICONS");
  lines.push("");
  if (changedIcons.length === 0) {
    lines.push("- None");
  } else {
    for (const icon of changedIcons) {
      lines.push(formatIconLine(icon));
    }
  }

  lines.push("");
  lines.push("## INVALID FILENAMES");
  lines.push("");
  if (invalidIcons.length === 0) {
    lines.push("- None");
  } else {
    for (const invalid of invalidIcons) {
      const suggestion = invalid.suggested ? ` (suggested rename: ${invalid.suggested})` : " (suggested rename: <unresolvable>)";
      lines.push(`- ${invalid.fileName}${suggestion}`);
    }
  }

  lines.push("");
  lines.push("## ORPHAN ICONS");
  lines.push("");
  lines.push("- N/A (no canonical catalog source found)");

  lines.push("");
  lines.push("## MISSING ICONS");
  lines.push("");
  lines.push("- N/A (no canonical catalog source found)");

  return `${lines.join("\n")}\n`;
}

async function readDirIfExists(dirPath) {
  try {
    await fs.access(dirPath);
    return true;
  } catch {
    return false;
  }
}

async function* walkFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(fullPath);
      continue;
    }

    if (!entry.isFile()) continue;
    yield fullPath;
  }
}

async function loadExerciseCatalogSlugs() {
  const migrationFiles = (await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const names = new Set();
  const sourceFiles = [];

  for (const fileName of migrationFiles) {
    const fullPath = path.join(MIGRATIONS_DIR, fileName);
    const content = await fs.readFile(fullPath, "utf8");

    const hasExerciseInsert = /insert\s+into\s+public\.exercises/i.test(content);
    const hasChestPressSelect = /select\s*\n\s*'Chest Press'/i.test(content);
    if (!hasExerciseInsert && !hasChestPressSelect) {
      continue;
    }

    sourceFiles.push(path.relative(rootDir, fullPath));

    const insertValuesRegex = /insert\s+into\s+public\.exercises[\s\S]*?values([\s\S]*?)(?:on\s+conflict|;)/gi;
    let insertMatch;
    while ((insertMatch = insertValuesRegex.exec(content)) !== null) {
      const valuesBlock = insertMatch[1];
      const nameRegex = /\(\s*'((?:[^']|(?:''))*)'\s*,/g;
      let nameMatch;
      while ((nameMatch = nameRegex.exec(valuesBlock)) !== null) {
        names.add(nameMatch[1].replace(/''/g, "'"));
      }
    }

    const chestPressSelectRegex = /select\s*\n\s*'((?:[^']|(?:''))*)'\s*,\s*\n\s*null\s*,\s*\n\s*true\s*,/gi;
    let selectMatch;
    while ((selectMatch = chestPressSelectRegex.exec(content)) !== null) {
      names.add(selectMatch[1].replace(/''/g, "'"));
    }
  }

  const slugs = [...names]
    .map((name) => slugifyExerciseName(name))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return {
    sourceFiles: sourceFiles.sort((a, b) => a.localeCompare(b)),
    namesCount: names.size,
    slugs,
  };
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function detectStagingDirs(explicitStagingDirs, iconsDir) {
  const candidates = explicitStagingDirs.length
    ? explicitStagingDirs
    : DEFAULT_STAGING_CANDIDATES.map((dir) => path.resolve(rootDir, dir));

  const normalizedIconsDir = path.normalize(iconsDir);
  return uniqueSorted(
    candidates.filter((candidate) => path.normalize(candidate) !== normalizedIconsDir)
  );
}

function categorizeSkipReason(file, iconsDir) {
  const ext = file.extension;
  if (!SUPPORTED_ICON_EXTENSIONS.has(ext)) {
    return "wrong extension";
  }

  const relativeFromIcons = path.relative(iconsDir, file.path);
  if (!relativeFromIcons.startsWith("..") && !path.isAbsolute(relativeFromIcons)) {
    if (file.relativeDir !== ".") {
      return "nested under subfolder";
    }

    if (file.fileName !== file.safeCanonicalName) {
      return "invalid filename";
    }
  }

  return "already present in canonical dir under correct name";
}

async function scanImagePool(baseDirs, iconsDir) {
  const allFiles = [];

  for (const baseDir of baseDirs) {
    if (!(await readDirIfExists(baseDir))) continue;

    for await (const fullPath of walkFiles(baseDir)) {
      const extension = path.extname(fullPath).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(extension)) continue;

      const fileName = path.basename(fullPath);
      const basename = path.basename(fileName, extension);
      const normalizedCandidateSlug = slugifyExerciseName(basename);
      const safeCanonicalName = normalizedCandidateSlug ? `${normalizedCandidateSlug}.png` : "<unresolvable>.png";

      allFiles.push({
        sourceRoot: baseDir,
        path: fullPath,
        relativePath: path.relative(rootDir, fullPath).split(path.sep).join("/"),
        relativeDir: path.dirname(path.relative(baseDir, fullPath)).split(path.sep).join("/"),
        fileName,
        basename,
        extension,
        normalizedCandidateSlug,
        safeCanonicalName,
      });
    }
  }

  allFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const duplicateMap = new Map();
  for (const file of allFiles) {
    if (!file.normalizedCandidateSlug) continue;
    const key = file.normalizedCandidateSlug;
    const list = duplicateMap.get(key) ?? [];
    list.push(file);
    duplicateMap.set(key, list);
  }

  const duplicateSlugs = new Set(
    [...duplicateMap.entries()].filter(([, files]) => files.length > 1).map(([slug]) => slug)
  );

  const skippedInventory = allFiles.map((file) => {
    const reasons = [];
    if (duplicateSlugs.has(file.normalizedCandidateSlug)) {
      reasons.push("duplicate candidate slug");
    }
    reasons.push(categorizeSkipReason(file, iconsDir));

    return {
      ...file,
      reasons: uniqueSorted(reasons),
    };
  });

  return {
    allFiles,
    duplicateMap,
    duplicateSlugs,
    skippedInventory,
  };
}

async function computeMissingSlugs(iconsDir, catalogSlugs) {
  const missing = [];

  for (const slug of catalogSlugs) {
    const pngPath = path.join(iconsDir, `${slug}.png`);
    const webpPath = path.join(iconsDir, `${slug}.webp`);
    const hasPng = await readDirIfExists(pngPath);
    const hasWebp = await readDirIfExists(webpPath);

    if (!hasPng && !hasWebp) {
      missing.push(slug);
    }
  }

  return missing.sort((a, b) => a.localeCompare(b));
}

function indexCandidatesBySlug(files) {
  const map = new Map();

  for (const file of files) {
    if (!file.normalizedCandidateSlug) continue;
    const bucket = map.get(file.normalizedCandidateSlug) ?? [];
    bucket.push(file);
    map.set(file.normalizedCandidateSlug, bucket);
  }

  for (const [, bucket] of map) {
    bucket.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  return map;
}

async function applyBackfill({ missingBefore, candidatesBySlug, iconsDir }) {
  const autofilled = [];
  const ambiguous = [];

  for (const slug of missingBefore) {
    const candidates = (candidatesBySlug.get(slug) ?? []).filter((file) => file.extension === ".png");

    if (candidates.length === 0) {
      continue;
    }

    if (candidates.length > 1) {
      ambiguous.push({ slug, candidates: candidates.map((file) => file.relativePath) });
      continue;
    }

    const candidate = candidates[0];
    const destinationPath = path.join(iconsDir, `${slug}.png`);

    await fs.copyFile(candidate.path, destinationPath);

    autofilled.push({
      slug,
      from: candidate.relativePath,
      to: path.relative(rootDir, destinationPath).split(path.sep).join("/"),
    });
  }

  autofilled.sort((a, b) => a.slug.localeCompare(b.slug));
  ambiguous.sort((a, b) => a.slug.localeCompare(b.slug));

  return { autofilled, ambiguous };
}

function formatList(items, formatter) {
  if (!items.length) {
    return ["- None"];
  }

  return items.map(formatter);
}

function buildBackfillReport({
  iconsDir,
  stagingDirs,
  catalog,
  missingBefore,
  missingAfter,
  apply,
  autofilled,
  ambiguous,
  skippedInventory,
}) {
  const lines = [];

  lines.push("# Exercise Icon Missing Backfill Report");
  lines.push("");
  lines.push(`Mode: ${apply ? "apply" : "report-only"}`);
  lines.push(`Canonical icons dir: \`${path.relative(rootDir, iconsDir) || "."}\``);
  lines.push(`Staging dirs scanned: ${stagingDirs.length ? stagingDirs.map((dir) => `\`${path.relative(rootDir, dir)}\``).join(", ") : "(none detected)"}`);
  lines.push("Catalog source files:");
  if (catalog.sourceFiles.length) {
    for (const file of catalog.sourceFiles) {
      lines.push(`- \`${file}\``);
    }
  } else {
    lines.push("- None");
  }

  lines.push("");
  lines.push("## Summary counts");
  lines.push("");
  lines.push(`- Catalog exercise names: ${catalog.namesCount}`);
  lines.push(`- Catalog slugs: ${catalog.slugs.length}`);
  lines.push(`- Missing before: ${missingBefore.length}`);
  lines.push(`- Auto-filled: ${autofilled.length}`);
  lines.push(`- Ambiguous missing slugs: ${ambiguous.length}`);
  lines.push(`- Missing after: ${missingAfter.length}`);
  lines.push(`- Skipped files inventory count: ${skippedInventory.length}`);

  lines.push("");
  lines.push("## Missing exercise slugs (before)");
  lines.push("");
  lines.push(...formatList(missingBefore, (slug) => `- ${slug}`));

  lines.push("");
  lines.push("## Auto-filled slugs");
  lines.push("");
  lines.push(...formatList(autofilled, (item) => `- ${item.slug}: \`${item.from}\` -> \`${item.to}\``));

  lines.push("");
  lines.push("## Ambiguous candidates per slug");
  lines.push("");
  if (!ambiguous.length) {
    lines.push("- None");
  } else {
    for (const item of ambiguous) {
      lines.push(`- ${item.slug}`);
      for (const candidate of item.candidates) {
        lines.push(`  - \`${candidate}\``);
      }
    }
  }

  lines.push("");
  lines.push("## Missing exercise slugs (after)");
  lines.push("");
  lines.push(...formatList(missingAfter, (slug) => `- ${slug}`));

  lines.push("");
  lines.push("## Skipped files inventory");
  lines.push("");
  if (!skippedInventory.length) {
    lines.push("- None");
  } else {
    for (const file of skippedInventory) {
      lines.push(`- \`${file.relativePath}\` | ext=${file.extension} | normalizedSlug=${file.normalizedCandidateSlug || "<empty>"} | suggested=${file.safeCanonicalName} | reason=${file.reasons.join(", ")}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

async function runSyncMode(options) {
  await fs.mkdir(options.iconsDir, { recursive: true });

  let previousManifestMap = new Map();
  try {
    const existingManifest = await fs.readFile(MANIFEST_PATH, "utf8");
    previousManifestMap = parseManifestMap(existingManifest);
  } catch {
    previousManifestMap = new Map();
  }

  const { validIcons, invalidIcons, totalScanned } = await readIconFiles(options.iconsDir);
  const { newIcons, changedIcons } = diffIcons(validIcons, previousManifestMap);
  const manifestRegenerated = await regenerateManifestIfPresent(MANIFEST_PATH);

  const report = buildReport({
    iconsDir: options.iconsDir,
    manifestRegenerated,
    totalScanned,
    validIcons,
    invalidIcons,
    newIcons,
    changedIcons,
  });

  await fs.writeFile(options.reportPath, report, "utf8");

  console.log(`Scanned ${totalScanned} icons (${validIcons.length} valid, ${invalidIcons.length} invalid).`);
  console.log(`New: ${newIcons.length}, Changed: ${changedIcons.length}.`);
  console.log(`Report written to ${path.relative(rootDir, options.reportPath)}.`);
}

async function runMissingBackfillMode(options) {
  await fs.mkdir(options.iconsDir, { recursive: true });

  const catalog = await loadExerciseCatalogSlugs();
  const stagingDirsDetected = detectStagingDirs(options.stagingDirs, options.iconsDir);
  const existingStagingDirs = [];

  for (const stagingDir of stagingDirsDetected) {
    if (await readDirIfExists(stagingDir)) {
      existingStagingDirs.push(stagingDir);
    }
  }

  const scanDirs = uniqueSorted([options.iconsDir, ...existingStagingDirs]);
  const { allFiles, skippedInventory } = await scanImagePool(scanDirs, options.iconsDir);
  const candidatesBySlug = indexCandidatesBySlug(allFiles);

  const missingBefore = await computeMissingSlugs(options.iconsDir, catalog.slugs);

  let autofilled = [];
  let ambiguous = [];

  if (options.apply) {
    const result = await applyBackfill({
      missingBefore,
      candidatesBySlug,
      iconsDir: options.iconsDir,
    });

    autofilled = result.autofilled;
    ambiguous = result.ambiguous;

    if (autofilled.length > 0) {
      await regenerateManifestIfPresent(MANIFEST_PATH);
    }
  } else {
    ambiguous = missingBefore
      .map((slug) => {
        const candidates = (candidatesBySlug.get(slug) ?? []).filter((file) => file.extension === ".png");
        if (candidates.length <= 1) {
          return null;
        }

        return {
          slug,
          candidates: candidates.map((file) => file.relativePath),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.slug.localeCompare(b.slug));
  }

  const missingAfter = await computeMissingSlugs(options.iconsDir, catalog.slugs);

  const report = buildBackfillReport({
    iconsDir: options.iconsDir,
    stagingDirs: existingStagingDirs,
    catalog,
    missingBefore,
    missingAfter,
    apply: options.apply,
    autofilled,
    ambiguous,
    skippedInventory,
  });

  await fs.writeFile(options.reportPath, report, "utf8");

  console.log(`Catalog slugs: ${catalog.slugs.length}`);
  console.log(`Missing before: ${missingBefore.length}`);
  console.log(`Auto-filled: ${autofilled.length}`);
  console.log(`Missing after: ${missingAfter.length}`);
  console.log(`Report written to ${path.relative(rootDir, options.reportPath)}.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.mode === "missing-backfill") {
    await runMissingBackfillMode(options);
    return;
  }

  if (options.mode !== "sync") {
    throw new Error(`Unsupported mode: ${options.mode}`);
  }

  await runSyncMode(options);
}

main().catch((error) => {
  console.error("Failed to sync exercise icons:", error);
  process.exitCode = 1;
});
