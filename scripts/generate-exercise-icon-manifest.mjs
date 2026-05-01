import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, "..");
const ICONS_DIR = path.join(repoRoot, "public", "exercises", "icons");
const CARD_OUTPUT_DIR = path.join(repoRoot, "public", "exercises", "cards");
const OUTPUT_FILE = path.join(repoRoot, "src", "generated", "exerciseIconManifest.ts");
const ALLOWED_EXTENSIONS = new Set([".png", ".svg", ".webp"]);
const CARD_PADDING_PX = 4;
const CARD_TRIM_THRESHOLD = 12;
const CACHE_SCHEMA_VERSION = 1;
const GENERATOR_NAME = "gen:exercise-icons";
const RECEIPT_FILE_NAME = "gen-exercise-icons.latest.json";

function toRepoRelative(targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join("/");
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findAtlasRoot(startDir) {
  let current = startDir;

  while (true) {
    if (await pathExists(path.join(current, "stack.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function toIso(value) {
  return new Date(value).toISOString();
}

function normalizeBooleanEnv(value) {
  if (!value) {
    return false;
  }

  return value !== "0" && value.toLowerCase() !== "false";
}

async function hashFile(targetPath) {
  const contents = await fs.readFile(targetPath);
  return crypto.createHash("sha256").update(contents).digest("hex");
}

async function hashString(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function buildInputFingerprint(sourceFiles) {
  const hash = crypto.createHash("sha256");
  const scriptHash = await hashFile(scriptPath);
  const configHash = await hashString(
    JSON.stringify({
      allowedExtensions: [...ALLOWED_EXTENSIONS].sort(),
      cardPaddingPx: CARD_PADDING_PX,
      cardTrimThreshold: CARD_TRIM_THRESHOLD,
      generatorName: GENERATOR_NAME,
      outputFile: toRepoRelative(OUTPUT_FILE),
      cardOutputDir: toRepoRelative(CARD_OUTPUT_DIR),
    }),
  );

  hash.update(JSON.stringify({ schemaVersion: CACHE_SCHEMA_VERSION, scriptHash, configHash }));

  for (const source of sourceFiles) {
    const fileHash = await hashFile(source.absolutePath);
    hash.update(JSON.stringify({
      path: source.relativePath,
      hash: fileHash,
    }));
  }

  return {
    value: hash.digest("hex"),
    scriptHash,
    configHash,
  };
}

async function getReceiptRoot() {
  const atlasRoot = await findAtlasRoot(repoRoot);
  return atlasRoot
    ? path.join(atlasRoot, "runtime", "receipts", "build")
    : path.join(repoRoot, "runtime", "receipts", "build");
}

async function getCacheFilePath() {
  const atlasRoot = await findAtlasRoot(repoRoot);
  const runtimeRoot = atlasRoot
    ? path.join(atlasRoot, "runtime")
    : path.join(repoRoot, "runtime");
  return path.join(runtimeRoot, "build-cache", "gen-exercise-icons.cache.json");
}

async function writeReceipt(receipt) {
  const receiptRoot = await getReceiptRoot();
  await fs.mkdir(receiptRoot, { recursive: true });
  const receiptPath = path.join(receiptRoot, RECEIPT_FILE_NAME);
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return receiptPath;
}

function isAllowedIconFile(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return false;
  }

  if (fileName.startsWith("_") && fileName !== "_placeholder.svg") {
    return false;
  }

  return true;
}

function supportsCardDerivative(extension) {
  return extension === ".png" || extension === ".webp";
}

async function generateTrimmedCardAsset(inputPath, outputPath) {
  await sharp(inputPath)
    .ensureAlpha()
    .trim({ threshold: CARD_TRIM_THRESHOLD })
    .extend({
      top: CARD_PADDING_PX,
      right: CARD_PADDING_PX,
      bottom: CARD_PADDING_PX,
      left: CARD_PADDING_PX,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outputPath);
}

async function collectSourceFiles() {
  const entries = await fs.readdir(ICONS_DIR, { withFileTypes: true });
  const sourceFiles = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!isAllowedIconFile(entry.name)) continue;

    const absolutePath = path.join(ICONS_DIR, entry.name);
    const extension = path.extname(entry.name).toLowerCase();
    const slug = path.basename(entry.name, extension);
    sourceFiles.push({
      absolutePath,
      relativePath: toRepoRelative(absolutePath),
      fileName: entry.name,
      extension,
      slug,
      generatesCard: supportsCardDerivative(extension) && slug !== "_placeholder",
      cardFileName: supportsCardDerivative(extension) && slug !== "_placeholder" ? `${slug}.png` : null,
    });
  }

  sourceFiles.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return sourceFiles;
}

async function getCacheState(sourceFiles, fingerprint) {
  const outputExists = await pathExists(OUTPUT_FILE);
  const cardDirExists = await pathExists(CARD_OUTPUT_DIR);
  const cachePath = await getCacheFilePath();
  const expectedCardFileNames = new Set(
    sourceFiles
      .filter((source) => source.cardFileName)
      .map((source) => source.cardFileName),
  );

  let missingOutputs = [];
  let extraCardFiles = [];

  if (!outputExists) {
    missingOutputs.push(toRepoRelative(OUTPUT_FILE));
  }

  if (!cardDirExists) {
    missingOutputs.push(toRepoRelative(CARD_OUTPUT_DIR));
  } else {
    const existingCardEntries = await fs.readdir(CARD_OUTPUT_DIR, { withFileTypes: true });
    const existingCardFileNames = existingCardEntries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    missingOutputs = missingOutputs.concat(
      [...expectedCardFileNames]
        .filter((fileName) => !existingCardFileNames.includes(fileName))
        .map((fileName) => `public/exercises/cards/${fileName}`),
    );

    extraCardFiles = existingCardFileNames
      .filter((fileName) => !expectedCardFileNames.has(fileName))
      .map((fileName) => `public/exercises/cards/${fileName}`);
  }

  if (!await pathExists(cachePath)) {
    return {
      cachePath,
      cacheStatus: "miss",
      cacheReason: "missing-fingerprint-cache",
      missingOutputs,
      extraCardFiles,
      expectedCardCount: expectedCardFileNames.size,
    };
  }

  let cached;
  try {
    cached = JSON.parse(await fs.readFile(cachePath, "utf8"));
  } catch {
    return {
      cachePath,
      cacheStatus: "miss",
      cacheReason: "invalid-fingerprint-cache",
      missingOutputs,
      extraCardFiles,
      expectedCardCount: expectedCardFileNames.size,
    };
  }

  if (cached.schemaVersion !== CACHE_SCHEMA_VERSION) {
    return {
      cachePath,
      cacheStatus: "miss",
      cacheReason: "cache-schema-changed",
      missingOutputs,
      extraCardFiles,
      expectedCardCount: expectedCardFileNames.size,
    };
  }

  if (cached.fingerprint !== fingerprint.value) {
    return {
      cachePath,
      cacheStatus: "miss",
      cacheReason: "input-fingerprint-changed",
      missingOutputs,
      extraCardFiles,
      expectedCardCount: expectedCardFileNames.size,
    };
  }

  if (missingOutputs.length > 0) {
    return {
      cachePath,
      cacheStatus: "miss",
      cacheReason: "generated-output-missing",
      missingOutputs,
      extraCardFiles,
      expectedCardCount: expectedCardFileNames.size,
    };
  }

  if (extraCardFiles.length > 0) {
    return {
      cachePath,
      cacheStatus: "miss",
      cacheReason: "stale-card-output-present",
      missingOutputs,
      extraCardFiles,
      expectedCardCount: expectedCardFileNames.size,
    };
  }

  return {
    cachePath,
    cacheStatus: "hit",
    cacheReason: "inputs-and-outputs-match",
    missingOutputs,
    extraCardFiles,
    expectedCardCount: expectedCardFileNames.size,
  };
}

async function generateExerciseIconManifest() {
  const startedAt = Date.now();
  const forceRegenerate = normalizeBooleanEnv(process.env.FORCE_GENERATE_EXERCISE_ICONS);
  const sourceFiles = await collectSourceFiles();
  const fingerprint = await buildInputFingerprint(sourceFiles);
  const cacheState = await getCacheState(sourceFiles, fingerprint);
  const shouldSkip = !forceRegenerate && cacheState.cacheStatus === "hit";
  const receiptBase = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    generator: GENERATOR_NAME,
    repoRoot,
    inputFingerprint: fingerprint.value,
    scriptHash: fingerprint.scriptHash,
    configHash: fingerprint.configHash,
    sourceCount: sourceFiles.length,
    expectedCardCount: cacheState.expectedCardCount,
    forced: forceRegenerate,
    cache: {
      status: shouldSkip ? "hit" : "miss",
      reason: forceRegenerate ? "force-regenerate" : cacheState.cacheReason,
      cacheFile: toRepoRelative(cacheState.cachePath),
      missingOutputs: cacheState.missingOutputs,
      extraCardFiles: cacheState.extraCardFiles,
    },
  };

  if (shouldSkip) {
    const endedAt = Date.now();
    const receiptPath = await writeReceipt({
      ...receiptBase,
      startedAt: toIso(startedAt),
      endedAt: toIso(endedAt),
      durationMs: endedAt - startedAt,
      skipped: true,
      outputManifest: toRepoRelative(OUTPUT_FILE),
      outputCardDir: toRepoRelative(CARD_OUTPUT_DIR),
    });

    console.log(
      `Skipped exercise icon manifest generation (${sourceFiles.length} icons, ${cacheState.expectedCardCount} cards). Cache hit at ${path.relative(repoRoot, receiptPath)}.`,
    );
    return;
  }

  const slugToExtension = new Map();
  const cardSrcBySlug = new Map();
  const nextCardFileNames = new Set();

  await fs.mkdir(CARD_OUTPUT_DIR, { recursive: true });

  for (const source of sourceFiles) {
    const fileName = source.fileName;
    const rawExtension = source.extension;
    const extension = rawExtension.slice(1);
    const slug = source.slug;
    slugToExtension.set(slug, extension);

    if (source.generatesCard && source.cardFileName) {
      const cardFileName = source.cardFileName;
      const inputPath = source.absolutePath;
      const outputPath = path.join(CARD_OUTPUT_DIR, cardFileName);
      await generateTrimmedCardAsset(inputPath, outputPath);
      cardSrcBySlug.set(slug, `/exercises/cards/${cardFileName}`);
      nextCardFileNames.add(cardFileName);
    }
  }

  const sortedEntries = [...slugToExtension.entries()].sort(([slugA], [slugB]) => slugA.localeCompare(slugB));
  const recordLines = sortedEntries.map(([slug, ext]) => `  ${JSON.stringify(slug)}: ${JSON.stringify(ext)},`);
  const sortedCardEntries = [...cardSrcBySlug.entries()].sort(([slugA], [slugB]) => slugA.localeCompare(slugB));
  const cardRecordLines = sortedCardEntries.map(([slug, src]) => `  ${JSON.stringify(slug)}: ${JSON.stringify(src)},`);

  const existingCardEntries = await fs.readdir(CARD_OUTPUT_DIR, { withFileTypes: true });
  await Promise.all(existingCardEntries.map(async (entry) => {
    if (!entry.isFile()) return;
    if (!entry.name.toLowerCase().endsWith(".png")) return;
    if (nextCardFileNames.has(entry.name)) return;
    await fs.rm(path.join(CARD_OUTPUT_DIR, entry.name), { force: true });
  }));

  const output = `// AUTO-GENERATED FILE. DO NOT EDIT.\n// Generated by scripts/generate-exercise-icon-manifest.mjs\n\nexport const EXERCISE_ICON_EXT_BY_SLUG: Record<string, string> = {\n${recordLines.join("\n")}\n};\n\nexport const EXERCISE_CARD_SRC_BY_SLUG: Record<string, string> = {\n${cardRecordLines.join("\n")}\n};\n\nexport const EXERCISE_ICON_SLUGS = new Set(Object.keys(EXERCISE_ICON_EXT_BY_SLUG));\nexport const EXERCISE_CARD_SLUGS = new Set(Object.keys(EXERCISE_CARD_SRC_BY_SLUG));\n`;

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, output, "utf8");
  await fs.mkdir(path.dirname(cacheState.cachePath), { recursive: true });
  await fs.writeFile(
    cacheState.cachePath,
    `${JSON.stringify({
      schemaVersion: CACHE_SCHEMA_VERSION,
      fingerprint: fingerprint.value,
      scriptHash: fingerprint.scriptHash,
      configHash: fingerprint.configHash,
      sourceCount: sourceFiles.length,
      cardCount: sortedCardEntries.length,
      updatedAt: toIso(Date.now()),
    }, null, 2)}\n`,
    "utf8",
  );

  const endedAt = Date.now();
  const receiptPath = await writeReceipt({
    ...receiptBase,
    startedAt: toIso(startedAt),
    endedAt: toIso(endedAt),
    durationMs: endedAt - startedAt,
    skipped: false,
    iconCount: sortedEntries.length,
    cardCount: sortedCardEntries.length,
    outputManifest: toRepoRelative(OUTPUT_FILE),
    outputCardDir: toRepoRelative(CARD_OUTPUT_DIR),
  });

  console.log(
    `Generated exercise icon manifest with ${sortedEntries.length} icons and ${sortedCardEntries.length} trimmed cards at ${path.relative(repoRoot, OUTPUT_FILE)}. Cache miss receipt: ${path.relative(repoRoot, receiptPath)}`,
  );
}

generateExerciseIconManifest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
