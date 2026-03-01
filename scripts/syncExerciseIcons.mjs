import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const DEFAULT_ICONS_DIR = path.resolve(rootDir, "public/exercises/icons");
const DEFAULT_REPORT_PATH = path.resolve(rootDir, "icon-sync-report.md");
const MANIFEST_PATH = path.resolve(rootDir, "src/generated/exerciseIconManifest.ts");

const VALID_ICON_FILE_RE = /^[a-z0-9-]+\.(png|webp)$/;
const SUGGESTED_SLUG_RE = /[^a-z0-9-]+/g;

function parseArgs(argv) {
  const options = {
    iconsDir: DEFAULT_ICONS_DIR,
    reportPath: DEFAULT_REPORT_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--iconsDir" && argv[index + 1]) {
      options.iconsDir = path.resolve(rootDir, argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--reportPath" && argv[index + 1]) {
      options.reportPath = path.resolve(rootDir, argv[index + 1]);
      index += 1;
    }
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
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

main().catch((error) => {
  console.error("Failed to sync exercise icons:", error);
  process.exitCode = 1;
});
