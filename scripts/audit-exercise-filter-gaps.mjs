import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const INPUT_PATH = path.join(ROOT, "supabase", "data", "global_exercises_catalog_index.json");
const OUTPUT_PATH = path.join(ROOT, "docs", "exercise-filter-gap-audit.md");

const WATCHLIST = [
  ["Bodyweight", "pattern_detail:squat"],
  ["Bodyweight", "pattern_detail:split_squat_lunge"],
  ["Bodyweight", "pattern_detail:horizontal_pull"],
  ["Bodyweight", "pattern_detail:vertical_push"],
  ["Bodyweight", "pattern_detail:plantar_flexion"],
  ["Cable", "pattern_detail:trunk_rotation"],
  ["Cable", "pattern_detail:anti_rotation"],
  ["Cable", "pattern_detail:hip_abduction"],
  ["Cable", "pattern_detail:hip_adduction"],
  ["Cable", "pattern_detail:hinge"],
  ["Machine", "pattern_detail:vertical_pull"],
  ["Sled", "loading_profile:sled_loaded"],
  ["Plate", "plane_of_motion:multi_planar"],
  ["training_goal:mobility", "training_goal:recovery"],
  ["training_goal:power"],
  ["spine_demand:chest_supported"],
];

const EXTRA_SENSIBLE_COMBOS = [
  ["Bodyweight", "pattern_detail:full_body_conditioning"],
  ["Bodyweight", "pattern_detail:locomotion_drill"],
  ["Bodyweight", "pattern_detail:plyometric_jump"],
  ["Dumbbell", "spine_demand:chest_supported"],
  ["Plate", "pattern_detail:trunk_rotation"],
  ["Sled", "pattern_detail:sled_drag"],
  ["Smith Machine", "hinge"],
  ["Smith Machine", "pattern_detail:horizontal_push"],
  ["training_goal:conditioning", "training_goal:power"],
];

function readSummary() {
  return JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
}

function normalizeToken(value) {
  return String(value ?? "").trim().toLowerCase();
}

function splitPrimaryMuscle(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildExerciseTokens(exercise) {
  const tokens = new Set();

  for (const value of splitPrimaryMuscle(exercise.primary_muscle)) {
    tokens.add(normalizeToken(value));
  }

  tokens.add(normalizeToken(exercise.movement_pattern));
  tokens.add(normalizeToken(exercise.equipment));

  for (const [group, values] of Object.entries(exercise.curation_tags ?? {})) {
    if (!Array.isArray(values)) {
      continue;
    }

    for (const value of values) {
      tokens.add(normalizeToken(`${group}:${value}`));
    }
  }

  return tokens;
}

function isIntentionalRepHold(exercise) {
  const name = exercise.name.toLowerCase();
  const patternDetail = exercise.curation_tags?.pattern_detail?.[0] ?? "";
  return name.includes("reach-through") || patternDetail === "trunk_rotation";
}

function filterExercises(exercises, combo) {
  const normalizedCombo = combo.map(normalizeToken);
  return exercises.filter((exercise) => normalizedCombo.every((token) => exercise.token_set.has(token)));
}

function statusForCount(count) {
  if (count === 0) {
    return "Empty";
  }
  if (count <= 2) {
    return "Thin";
  }
  return "OK";
}

function describeCombo(combo) {
  return combo.join(" + ");
}

function dedupeCombos(combos) {
  const seen = new Set();
  const next = [];

  for (const combo of combos) {
    const key = combo.map(normalizeToken).join("|");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(combo);
  }

  return next;
}

function markdownEscape(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function buildSuspiciousRows(exercises) {
  const suspiciousChecks = [
    {
      label: "Suspicious: Bodyweight + loading_profile:cardio_machine",
      matches: exercises.filter((exercise) => normalizeToken(exercise.equipment) === "bodyweight"
        && exercise.curation_tags.loading_profile?.includes("cardio_machine")),
    },
    {
      label: "Suspicious: Sled without sled_loaded",
      matches: exercises.filter((exercise) => normalizeToken(exercise.equipment) === "sled"
        && !exercise.curation_tags.loading_profile?.includes("sled_loaded")),
    },
    {
      label: "Suspicious: Cardio Machine without cardio_machine",
      matches: exercises.filter((exercise) => normalizeToken(exercise.equipment) === "cardio machine"
        && !exercise.curation_tags.loading_profile?.includes("cardio_machine")),
    },
    {
      label: "Suspicious: curl name without biceps primary_muscles",
      matches: exercises.filter((exercise) => /curl/i.test(exercise.name)
        && !exercise.curation_tags.pattern_detail?.includes("knee_flexion")
        && !exercise.primary_muscles.includes("biceps")),
    },
    {
      label: "Suspicious: shoulder press or overhead press includes chest",
      matches: exercises.filter((exercise) => /(shoulder press|overhead press)/i.test(exercise.name)
        && exercise.primary_muscles.includes("chest")),
    },
    {
      label: "Suspicious: calf raise without calves primary_muscles",
      matches: exercises.filter((exercise) => /calf raise/i.test(exercise.name)
        && !exercise.primary_muscles.includes("calves")),
    },
    {
      label: "Suspicious: plank/hold not time-based unless intentionally reps",
      matches: exercises.filter((exercise) => {
        const name = exercise.name.toLowerCase();
        const looksLikeHold = name.includes("plank") || name.includes("hold");
        return looksLikeHold && !isIntentionalRepHold(exercise) && exercise.measurement_type !== "time";
      }),
    },
    {
      label: "Suspicious: mobility_drill not time or reps",
      matches: exercises.filter((exercise) => exercise.curation_tags.pattern_detail?.includes("mobility_drill")
        && !["time", "reps"].includes(exercise.measurement_type)),
    },
  ];

  return suspiciousChecks.map((check) => ({
    combination: check.label,
    count: check.matches.length,
    names: check.matches.map((exercise) => exercise.name),
    status: check.matches.length > 0 ? "Suspicious" : "OK",
  }));
}

function buildMarkdown(rows, summary) {
  const lines = [
    "# Exercise Filter Gap Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Input: \`supabase/data/global_exercises_catalog_index.json\``,
    "",
    "## Summary",
    "",
    `- Exercises audited: ${summary.exerciseCount}`,
    `- Sensible combinations checked: ${summary.comboCount}`,
    `- Empty sensible combinations: ${summary.emptyCount}`,
    `- Thin sensible combinations: ${summary.thinCount}`,
    `- Suspicious metadata checks with matches: ${summary.suspiciousCount}`,
    "",
    "## Audit Table",
    "",
    "| Filter combination | Count | Matching exercise names | Status |",
    "| --- | ---: | --- | --- |",
  ];

  for (const row of rows) {
    lines.push(`| ${markdownEscape(row.combination)} | ${row.count} | ${markdownEscape(row.names.length > 0 ? row.names.join(", ") : "-")} | ${row.status} |`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function main() {
  const summary = readSummary();
  const exercises = (summary.exercises ?? []).map((exercise) => ({
    ...exercise,
    token_set: buildExerciseTokens(exercise),
  }));

  const combos = dedupeCombos([...WATCHLIST, ...EXTRA_SENSIBLE_COMBOS]);
  const comboRows = combos.map((combo) => {
    const matches = filterExercises(exercises, combo);
    return {
      combination: describeCombo(combo),
      count: matches.length,
      names: matches.map((exercise) => exercise.name),
      status: statusForCount(matches.length),
    };
  });
  const suspiciousRows = buildSuspiciousRows(exercises);
  const rows = [...comboRows, ...suspiciousRows];

  const report = buildMarkdown(rows, {
    exerciseCount: exercises.length,
    comboCount: comboRows.length,
    emptyCount: comboRows.filter((row) => row.status === "Empty").length,
    thinCount: comboRows.filter((row) => row.status === "Thin").length,
    suspiciousCount: suspiciousRows.filter((row) => row.status === "Suspicious").length,
  });

  fs.writeFileSync(OUTPUT_PATH, report);
  process.stdout.write(report);
}

main();
