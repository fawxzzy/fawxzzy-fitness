import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CANONICAL_SOURCE_PATH = path.resolve(ROOT, "supabase/data/global_exercises_canonical.json");
const ICONS_DIR = path.resolve(ROOT, "public/exercises/icons");
const MANIFEST_PATH = path.resolve(ROOT, "src/generated/exerciseIconManifest.ts");
const OUTPUT_DIR = path.resolve(ROOT, "artifacts/icon-audit");
const REPORT_PATH = path.resolve(ROOT, "docs/icon-audit-report.md");

const HIGH_CONFIDENCE_SCORE = 0.92;
const HIGH_CONFIDENCE_RUNNER_UP_MAX = 0.85;
const MIN_CANDIDATE_SCORE = 0.75;

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

function normalizeComparable(value) {
  return value
    .toLowerCase()
    .replace(/\.(png)$/i, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function tokenize(value) {
  return value.split("-").filter(Boolean);
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function parseManifestMap(content) {
  const map = new Map();
  const recordMatch = content.match(/EXERCISE_ICON_EXT_BY_SLUG:[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  if (!recordMatch) return map;
  const lineMatches = [...recordMatch[1].matchAll(/\s*"([^"]+)":\s*"([^"]+)",/g)];
  for (const [, slug, ext] of lineMatches) {
    map.set(slug, ext);
  }
  return map;
}

function csvEscape(value) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
}

async function writeCsv(filePath, headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
}

function scoreCandidate(slugKey, iconKey) {
  const slugTokens = new Set(tokenize(slugKey));
  const iconTokens = new Set(tokenize(iconKey));
  const overlapCount = [...slugTokens].filter((token) => iconTokens.has(token)).length;
  const tokenOverlap = (2 * overlapCount) / Math.max(slugTokens.size + iconTokens.size, 1);

  const distance = levenshtein(slugKey, iconKey);
  const maxLen = Math.max(slugKey.length, iconKey.length, 1);
  const editScore = 1 - distance / maxLen;

  const containsBoost = slugKey.includes(iconKey) || iconKey.includes(slugKey) ? 1 : 0;
  const sharedPrefixLength = (() => {
    const max = Math.min(slugKey.length, iconKey.length);
    let i = 0;
    while (i < max && slugKey[i] === iconKey[i]) i += 1;
    return i;
  })();
  const prefixScore = sharedPrefixLength / maxLen;

  const score = 0.3 * tokenOverlap + 0.55 * editScore + 0.1 * containsBoost + 0.05 * prefixScore;
  const reasons = [
    `token_overlap_dice=${overlapCount}/${slugTokens.size + iconTokens.size}`,
    `edit_distance=${distance}`,
    containsBoost ? "containment=yes" : "containment=no",
    `prefix_ratio=${prefixScore.toFixed(2)}`,
  ];

  return {
    score,
    reasons,
    distance,
    tokenOverlap,
  };
}

async function main() {
  const [canonicalRaw, manifestRaw, iconEntries] = await Promise.all([
    fs.readFile(CANONICAL_SOURCE_PATH, "utf8"),
    fs.readFile(MANIFEST_PATH, "utf8"),
    fs.readdir(ICONS_DIR, { withFileTypes: true }),
  ]);

  const canonicalData = JSON.parse(canonicalRaw);
  const manifestMap = parseManifestMap(manifestRaw);

  const pngFiles = iconEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase().endsWith(".png"))
    .sort((a, b) => a.localeCompare(b));

  const iconsIndex = pngFiles.map((fileName) => ({
    filename: fileName,
    basename: fileName.slice(0, -4),
    normalized_key: normalizeComparable(fileName),
    path: `/exercises/icons/${fileName}`,
  }));

  const iconSet = new Set(pngFiles);
  const iconByNormalized = new Map();
  for (const icon of iconsIndex) {
    const list = iconByNormalized.get(icon.normalized_key) ?? [];
    list.push(icon);
    iconByNormalized.set(icon.normalized_key, list);
  }

  const records = canonicalData.map((item, index) => {
    const canonicalSlug = slugifyExerciseName(item.name);
    const expectedFilename = `${canonicalSlug}.png`;
    const expectedPath = `/exercises/icons/${expectedFilename}`;
    const expectedExists = iconSet.has(expectedFilename);

    const manifestExt = manifestMap.get(canonicalSlug);
    const currentMappedPath = manifestExt
      ? `/exercises/icons/${canonicalSlug}.${manifestExt}`
      : "/exercises/icons/_placeholder.svg";

    const slugKey = normalizeComparable(canonicalSlug);
    const candidates = iconsIndex
      .map((icon) => {
        const scored = scoreCandidate(slugKey, icon.normalized_key);
        return {
          path: icon.path,
          filename: icon.filename,
          normalized_key: icon.normalized_key,
          score: scored.score,
          reasons: scored.reasons,
        };
      })
      .sort((a, b) => b.score - a.score || a.filename.localeCompare(b.filename))
      .slice(0, 3);

    const [top, runnerUp] = candidates;
    const topScore = top?.score ?? 0;
    const runnerUpScore = runnerUp?.score ?? 0;

    let bucket = "";
    let decision = "";
    let notes = "";

    const isPlaceholder = currentMappedPath === "/exercises/icons/_placeholder.svg";
    const currentlyUsingExpected = currentMappedPath === expectedPath;

    if (expectedExists && !currentlyUsingExpected) {
      bucket = "bucket1_new_icon_exists";
      notes = `exact file exists and current mapping is ${currentMappedPath}`;
    } else if (!expectedExists) {
      if (topScore >= HIGH_CONFIDENCE_SCORE && runnerUpScore < HIGH_CONFIDENCE_RUNNER_UP_MAX) {
        bucket = "bucket2_off_by_name";
        decision = "high-confidence";
        notes = top ? `suggest rename to ${expectedFilename}; ${top.reasons.join("; ")}` : "";
      } else if (topScore >= MIN_CANDIDATE_SCORE) {
        bucket = "bucket2_off_by_name";
        decision = "ambiguous";
        notes = top
          ? `multiple/uncertain candidates; top=${top.reasons.join("; ")}; runner_up_score=${runnerUpScore.toFixed(3)}`
          : "";
      } else if (isPlaceholder) {
        bucket = "bucket3_imageless";
        notes = "no exact icon and no candidate above threshold";
      } else {
        bucket = "other_non_placeholder_missing_expected";
        notes = "resolver maps to non-placeholder via alternate slug but expected exact is missing";
      }
    }

    return {
      exercise_id: item.id ?? `global:${canonicalSlug}`,
      exercise_name: item.name,
      canonical_slug: canonicalSlug,
      expectedFilename,
      expected_path: expectedPath,
      current_mapped_path: currentMappedPath,
      expected_file_exists: expectedExists,
      top_candidate_path: top?.path ?? "",
      top_score: topScore,
      runner_up_path: runnerUp?.path ?? "",
      runner_up_score: runnerUpScore,
      decision,
      notes,
      bucket,
      source_index: index,
    };
  });

  const bucket1 = records.filter((r) => r.bucket === "bucket1_new_icon_exists");
  const bucket2 = records.filter((r) => r.bucket === "bucket2_off_by_name");
  const bucket2High = bucket2.filter((r) => r.decision === "high-confidence");
  const bucket2Ambiguous = bucket2.filter((r) => r.decision === "ambiguous");
  const bucket3 = records.filter((r) => r.bucket === "bucket3_imageless");

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  await writeCsv(
    path.join(OUTPUT_DIR, "bucket-1-new-icons.csv"),
    ["exercise_id", "exercise_name", "canonical_slug", "current_mapped_path", "expected_path", "expected_file_exists"],
    bucket1.map((r) => ({
      exercise_id: r.exercise_id,
      exercise_name: r.exercise_name,
      canonical_slug: r.canonical_slug,
      current_mapped_path: r.current_mapped_path,
      expected_path: r.expected_path,
      expected_file_exists: r.expected_file_exists,
    }))
  );

  await writeCsv(
    path.join(OUTPUT_DIR, "bucket-2-off-by-name.csv"),
    [
      "exercise_id",
      "exercise_name",
      "canonical_slug",
      "expected_path",
      "top_candidate_path",
      "top_score",
      "runner_up_path",
      "runner_up_score",
      "decision",
      "notes",
    ],
    bucket2.map((r) => ({
      exercise_id: r.exercise_id,
      exercise_name: r.exercise_name,
      canonical_slug: r.canonical_slug,
      expected_path: r.expected_path,
      top_candidate_path: r.top_candidate_path,
      top_score: r.top_score.toFixed(3),
      runner_up_path: r.runner_up_path,
      runner_up_score: r.runner_up_score.toFixed(3),
      decision: r.decision,
      notes: r.notes,
    }))
  );

  await writeCsv(
    path.join(OUTPUT_DIR, "bucket-3-imageless.csv"),
    ["exercise_id", "exercise_name", "canonical_slug", "notes"],
    bucket3.map((r) => ({
      exercise_id: r.exercise_id,
      exercise_name: r.exercise_name,
      canonical_slug: r.canonical_slug,
      notes: r.notes,
    }))
  );

  await writeCsv(
    path.join(OUTPUT_DIR, "all-icons-index.csv"),
    ["filename", "normalized_key"],
    iconsIndex.map((icon) => ({ filename: icon.filename, normalized_key: icon.normalized_key }))
  );

  if (bucket2High.length > 0) {
    const renameLines = ["#!/usr/bin/env bash", "set -euo pipefail", "", "# Proposed renames only. Review before running."];
    const usedTargets = new Set();
    let collisionCount = 0;

    for (const row of bucket2High) {
      const from = row.top_candidate_path.replace("/exercises/icons/", "public/exercises/icons/");
      const to = row.expected_path.replace("/exercises/icons/", "public/exercises/icons/");
      if (usedTargets.has(to)) {
        collisionCount += 1;
        renameLines.push(`# COLLISION: ${from} -> ${to}`);
        continue;
      }
      usedTargets.add(to);
      renameLines.push(`cp "${from}" "${to}.safety-copy"`);
      renameLines.push(`mv "${from}" "${to}"`);
    }

    await fs.writeFile(path.join(OUTPUT_DIR, "proposed-renames.sh"), `${renameLines.join("\n")}\n`, "utf8");
    if (collisionCount > 0) {
      await fs.writeFile(path.join(OUTPUT_DIR, "proposed-renames-collisions.txt"), `${collisionCount}\n`, "utf8");
    }
  }

  const report = [
    "# Exercise ↔ Icon Audit Report",
    "",
    "## Canonical sources",
    `- Canonical exercise list chosen: \`supabase/data/global_exercises_canonical.json\` (seed source for global exercise catalog consumed by DB-backed Exercise Browser).`,
    `- Canonical slug rule: \`slugifyExerciseName\` from app logic (lowercase, whitespace/underscore -> hyphen, strip non-alnum except hyphen).`,
    `- Current icon resolver contract: \`src/lib/exerciseImages.ts\` via manifest lookup first (slug), then fallback to name-slug lookup, else placeholder.`,
    `- Icon directory audited (case-sensitive): \`public/exercises/icons/\`.`,
    "",
    "## Summary",
    `- Canonical exercises scanned: ${records.length}`,
    `- PNG files scanned: ${pngFiles.length}`,
    `- Bucket 1 (new exact icon exists but not currently mapped): ${bucket1.length}`,
    `- Bucket 2a (off-by-name, high-confidence): ${bucket2High.length}`,
    `- Bucket 2b (off-by-name, ambiguous): ${bucket2Ambiguous.length}`,
    `- Bucket 3 (imageless): ${bucket3.length}`,
    "",
    "## Deterministic matching policy",
    "- Exact match: `<canonical_slug>.png` is authoritative.",
    "- Near match scoring: token overlap + normalized edit distance + containment + prefix ratio.",
    `- Auto-suggest threshold: >= ${HIGH_CONFIDENCE_SCORE.toFixed(2)} with runner-up < ${HIGH_CONFIDENCE_RUNNER_UP_MAX.toFixed(2)}.`,
    `- Imageless threshold: no candidate >= ${MIN_CANDIDATE_SCORE.toFixed(2)} and current mapping is placeholder.`,
    "",
    "## Outputs",
    "- `artifacts/icon-audit/bucket-1-new-icons.csv`",
    "- `artifacts/icon-audit/bucket-2-off-by-name.csv`",
    "- `artifacts/icon-audit/bucket-3-imageless.csv`",
    "- `artifacts/icon-audit/all-icons-index.csv`",
    bucket2High.length > 0 ? "- `artifacts/icon-audit/proposed-renames.sh` (proposal only; not executed)" : "- Proposed renames: none",
    "",
    "## Next actions",
    "1. Review bucket 2 ambiguous rows and choose canonical filenames manually.",
    "2. If approving bucket 2a suggestions, run proposed rename commands in a separate explicit PR.",
    "3. Re-run `npm run audit:exercise-icons` after any icon file changes.",
  ].join("\n");

  await fs.writeFile(REPORT_PATH, `${report}\n`, "utf8");

  console.log(`Audit complete. Exercises=${records.length}, PNGs=${pngFiles.length}`);
  console.log(`Bucket1=${bucket1.length}, Bucket2a=${bucket2High.length}, Bucket2b=${bucket2Ambiguous.length}, Bucket3=${bucket3.length}`);
}

main().catch((error) => {
  console.error("Failed to audit exercise icons:", error);
  process.exitCode = 1;
});
