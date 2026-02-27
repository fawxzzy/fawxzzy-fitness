import { promises as fs } from "node:fs";
import path from "node:path";

const ICONS_DIR = path.resolve(process.cwd(), "public/exercises/icons");

function toKebabCase(input) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function normalizeIcons() {
  const entries = await fs.readdir(ICONS_DIR, { withFileTypes: true });
  const pngFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const alreadyNormalized = [];
  const needsNormalization = [];
  const duplicates = [];

  const normalizedFileSet = new Set(pngFiles);

  for (const fileName of pngFiles) {
    const baseName = fileName.replace(/\.png$/i, "");
    const normalizedBase = toKebabCase(baseName);
    const normalizedName = `${normalizedBase}.png`;
    const isAlreadyNormalized = fileName === normalizedName;

    if (isAlreadyNormalized) {
      alreadyNormalized.push(fileName);
      continue;
    }

    needsNormalization.push({ old: fileName, normalized: normalizedName });

    if (normalizedFileSet.has(normalizedName)) {
      duplicates.push({ old: fileName, existingNormalized: normalizedName });
    }
  }

  console.log("Exercise icon normalization report");
  console.log("================================");
  console.log(`Already normalized (${alreadyNormalized.length}):`);
  for (const fileName of alreadyNormalized) {
    console.log(`  - ${fileName}`);
  }

  console.log(`\nNeeds normalization (${needsNormalization.length}):`);
  for (const item of needsNormalization) {
    console.log(`  - ${item.old} -> ${item.normalized}`);
  }

  console.log(`\nDuplicates (${duplicates.length}):`);
  for (const item of duplicates) {
    console.log(`  - ${item.old} + ${item.existingNormalized}`);
  }

  let renamed = 0;
  let overwritten = 0;
  let deleted = 0;
  let unchanged = alreadyNormalized.length;

  for (const item of needsNormalization) {
    const from = path.join(ICONS_DIR, item.old);
    const to = path.join(ICONS_DIR, item.normalized);

    if (item.old === item.normalized) {
      unchanged += 1;
      continue;
    }

    try {
      await fs.access(to);
      await fs.copyFile(from, to);
      overwritten += 1;
      await fs.unlink(from);
      deleted += 1;
    } catch {
      await fs.rename(from, to);
      renamed += 1;
    }
  }

  console.log("\nSummary");
  console.log("=======");
  console.log(`normalized: ${renamed}`);
  console.log(`overwritten: ${overwritten}`);
  console.log(`deleted: ${deleted}`);
  console.log(`unchanged: ${unchanged}`);
}

normalizeIcons().catch((error) => {
  console.error("Failed to normalize exercise icons:", error);
  process.exitCode = 1;
});
