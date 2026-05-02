import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SOURCE_PATH = path.join(ROOT, "supabase", "data", "global_exercises_canonical.json");
const INDEX_JSON_PATH = path.join(ROOT, "supabase", "data", "global_exercises_catalog_index.json");
const INDEX_CSV_PATH = path.join(ROOT, "supabase", "data", "global_exercises_catalog_index.csv");
const REPORT_MD_PATH = path.join(ROOT, "docs", "exercise-catalog-analysis.md");
const REVIEW_JSON_PATH = path.join(ROOT, "supabase", "data", "global_exercises_review_queue.json");
const REVIEW_MD_PATH = path.join(ROOT, "docs", "exercise-catalog-review-queue.md");

const CURATION_GROUPS = [
  "pattern_detail",
  "plane_of_motion",
  "exercise_utility",
  "body_position",
  "training_goal",
  "difficulty",
  "setup_cost",
  "stability_requirement",
  "unilateral_profile",
  "loading_profile",
  "joint_emphasis",
  "spine_demand",
  "grip_constraint",
];

function readCatalog() {
  return JSON.parse(fs.readFileSync(SOURCE_PATH, "utf8"));
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item ?? "").trim()).filter(Boolean))];
}

function normalizeCurationTags(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(CURATION_GROUPS.map((group) => [group, normalizeArray(source[group])]));
}

function countBy(values) {
  const counts = new Map();

  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (!normalized) {
      continue;
    }

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function flattenCurationTagPairs(curationTags) {
  return CURATION_GROUPS.flatMap((group) => (curationTags[group] ?? []).map((value) => `${group}:${value}`));
}

function buildSearchText(exercise) {
  return [
    exercise.name,
    exercise.slug,
    exercise.primary_muscle,
    ...exercise.primary_muscles,
    ...exercise.secondary_muscles,
    exercise.equipment,
    exercise.movement_pattern,
    ...exercise.facet_tags,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function isIntentionalRepHold(exercise) {
  const name = exercise.name.toLowerCase();
  const patternDetail = exercise.curation_tags.pattern_detail?.[0] ?? "";
  return name.includes("reach-through") || patternDetail === "trunk_rotation";
}

function buildReviewFlags(exercise) {
  const flags = [];
  const name = exercise.name.toLowerCase();
  const patternDetail = exercise.curation_tags.pattern_detail?.[0] ?? "";
  const equipment = exercise.equipment.toLowerCase();
  const measurementType = exercise.measurement_type;
  const caloriesMethod = exercise.calories_estimation_method;

  const timedHold = (name.includes("plank") || name.includes("hold") || name === "stretch") && !isIntentionalRepHold(exercise);
  const cardioPattern = new Set(["running", "walking", "cycling", "rowing", "step_cardio", "rope_skip", "sled_drive"]);

  if (!measurementType) {
    flags.push("missing_measurement_type");
  }
  if (measurementType === "time" && exercise.default_unit !== "s") {
    flags.push("time_unit_not_seconds");
  }
  if (measurementType === "distance" && exercise.default_unit !== "m") {
    flags.push("distance_unit_not_meters");
  }
  if (measurementType === "time_distance" && exercise.default_unit !== "m") {
    flags.push("time_distance_unit_not_meters");
  }
  if (measurementType === "reps" && exercise.default_unit !== "reps") {
    flags.push("reps_unit_not_reps");
  }
  if (timedHold && measurementType !== "time") {
    flags.push("timed_hold_not_time_based");
  }
  if (cardioPattern.has(patternDetail) && !["time", "distance", "time_distance"].includes(measurementType)) {
    flags.push("cardio_pattern_not_cardio_measured");
  }
  if (equipment === "cardio machine" && caloriesMethod !== "machine_reported") {
    flags.push("cardio_machine_missing_machine_reported_calories");
  }
  if (equipment !== "cable" && name.includes("cable")) {
    flags.push("name_mentions_cable_but_equipment_differs");
  }
  if (equipment !== "dumbbell" && name.includes("dumbbell")) {
    flags.push("name_mentions_dumbbell_but_equipment_differs");
  }
  if (equipment !== "barbell" && name.includes("barbell")) {
    flags.push("name_mentions_barbell_but_equipment_differs");
  }
  if (equipment !== "smith machine" && name.includes("smith")) {
    flags.push("name_mentions_smith_but_equipment_differs");
  }
  if (equipment !== "plate" && name.includes("plate")) {
    flags.push("name_mentions_plate_but_equipment_differs");
  }
  if (equipment !== "sled" && name.includes("sled")) {
    flags.push("name_mentions_sled_but_equipment_differs");
  }
  if (["treadmill run", "incline walk", "stationary bike", "air bike sprint", "rowing machine", "stair climber"].includes(name) && equipment !== "cardio machine") {
    flags.push("known_cardio_machine_name_but_equipment_differs");
  }

  return flags;
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }
  return stringValue;
}

function buildCoverage(rows) {
  return {
    withHowTo: rows.filter((row) => row.how_to_short.length > 0).length,
    withMeasurementType: rows.filter((row) => row.measurement_type.length > 0).length,
    withDefaultUnit: rows.filter((row) => row.default_unit.length > 0).length,
    withCaloriesEstimationMethod: rows.filter((row) => row.calories_estimation_method.length > 0).length,
    withPrimaryMusclesArray: rows.filter((row) => row.primary_muscles.length > 0).length,
    withSecondaryMusclesArray: rows.filter((row) => row.secondary_muscles.length > 0).length,
    withHowToImage: rows.filter((row) => row.image_howto_path.length > 0).length,
    withMuscleImage: rows.filter((row) => row.image_muscles_path.length > 0).length,
    withFullCuration: rows.filter((row) => CURATION_GROUPS.every((group) => Array.isArray(row.curation_tags[group]))).length,
  };
}

function formatCountList(entries) {
  return entries.map((entry) => `- \`${entry.value}\`: ${entry.count}`).join("\n");
}

function buildMarkdownReport(summary) {
  return [
    "# Exercise Catalog Analysis",
    "",
    `Generated: ${summary.generated_at}`,
    "",
    `Source of truth: \`supabase/data/global_exercises_canonical.json\``,
    "",
    "## Snapshot",
    "",
    `- Total exercises: ${summary.exercise_count}`,
    `- Unique equipment values: ${summary.facets.equipment.length}`,
    `- Unique movement patterns: ${summary.facets.movement_pattern.length}`,
    `- Unique measurement types: ${summary.facets.measurement_type.length}`,
    `- Unique pattern-detail tags: ${summary.facets.pattern_detail.length}`,
    `- Review-queue items: ${summary.review_queue_count}`,
    `- Manual spot-check rows (non-reps): ${summary.manual_spot_checks.non_reps_measurements.length}`,
    "",
    "## Coverage",
    "",
    `- How-to copy populated: ${summary.coverage.withHowTo}/${summary.exercise_count}`,
    `- Measurement type populated: ${summary.coverage.withMeasurementType}/${summary.exercise_count}`,
    `- Default unit populated: ${summary.coverage.withDefaultUnit}/${summary.exercise_count}`,
    `- Primary muscles array populated: ${summary.coverage.withPrimaryMusclesArray}/${summary.exercise_count}`,
    `- Secondary muscles array populated: ${summary.coverage.withSecondaryMusclesArray}/${summary.exercise_count}`,
    `- Full curation-tag coverage: ${summary.coverage.withFullCuration}/${summary.exercise_count}`,
    "",
    "## Top Facets",
    "",
    "### Equipment",
    "",
    formatCountList(summary.facets.equipment),
    "",
    "### Movement Pattern",
    "",
    formatCountList(summary.facets.movement_pattern),
    "",
    "### Measurement Type",
    "",
    formatCountList(summary.facets.measurement_type),
    "",
    "### Pattern Detail",
    "",
    formatCountList(summary.facets.pattern_detail),
    "",
    "### Plane Of Motion",
    "",
    formatCountList(summary.facets.plane_of_motion),
    "",
    "### Exercise Utility",
    "",
    formatCountList(summary.facets.exercise_utility),
    "",
    "### Body Position",
    "",
    formatCountList(summary.facets.body_position),
    "",
    "### Training Goal",
    "",
    formatCountList(summary.facets.training_goal),
    "",
    "## Prep Notes",
    "",
    "- Keep `global_exercises_canonical.json` as the editable source of truth and regenerate every other artifact from it.",
    "- Use `global_exercises_catalog_index.json` for analysis, audits, and future admin tooling instead of reading UI-facing code paths.",
    "- Use `global_exercises_catalog_index.csv` when you want fast spreadsheet-style review or bulk cleanup planning.",
    "- For runtime efficiency, the history/browser surfaces should eventually read a trimmed catalog payload and lazy-load long how-to/media fields only in detail contexts.",
    "- Before expanding the total catalog aggressively, lock a stable slug/id strategy so future search, overrides, and migrations stay deterministic.",
    "",
  ].join("\n");
}

function buildReviewMarkdown(reviewQueue, manualSpotChecks) {
  const grouped = new Map();
  for (const item of reviewQueue) {
    for (const flag of item.review_flags) {
      const bucket = grouped.get(flag) ?? [];
      bucket.push(item);
      grouped.set(flag, bucket);
    }
  }

  return [
    "# Exercise Catalog Review Queue",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    reviewQueue.length === 0 ? "No review flags generated." : `Flagged exercises: ${reviewQueue.length}`,
    "",
    "## Manual Spot Checks",
    "",
    "### Non-reps Measurement Rows",
    "",
    ...manualSpotChecks.non_reps_measurements.map((item) => `- \`${item.name}\` | measurement=\`${item.measurement_type}\` | default=\`${item.default_unit}\` | equipment=\`${item.equipment}\` | pattern=\`${item.pattern_detail}\``),
    "",
    "### Rare Equipment Rows",
    "",
    ...manualSpotChecks.rare_equipment.map((item) => `- \`${item.name}\` | equipment=\`${item.equipment}\` | measurement=\`${item.measurement_type}\` | pattern=\`${item.pattern_detail}\``),
    "",
    ...[...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])).flatMap(([flag, items]) => [
      `## ${flag}`,
      "",
      ...items.map((item) => `- \`${item.name}\` | equipment=\`${item.equipment}\` | measurement=\`${item.measurement_type}\` | default=\`${item.default_unit}\` | pattern=\`${item.pattern_detail}\``),
      "",
    ]),
  ].join("\n");
}

function buildManualSpotChecks(exercises) {
  return {
    non_reps_measurements: exercises
      .filter((exercise) => exercise.measurement_type !== "reps")
      .map((exercise) => ({
        name: exercise.name,
        measurement_type: exercise.measurement_type,
        default_unit: exercise.default_unit,
        equipment: exercise.equipment,
        pattern_detail: exercise.curation_tags.pattern_detail?.[0] ?? "",
      })),
    rare_equipment: exercises
      .filter((exercise) => ["Plate", "Sled", "Smith Machine", "Cardio Machine"].includes(exercise.equipment))
      .map((exercise) => ({
        name: exercise.name,
        equipment: exercise.equipment,
        measurement_type: exercise.measurement_type,
        pattern_detail: exercise.curation_tags.pattern_detail?.[0] ?? "",
      })),
  };
}

function main() {
  const source = readCatalog();
  const exercises = source.map((row, index) => {
    const curationTags = normalizeCurationTags(row.curation_tags);
    const slug = slugify(row.name);
    const primaryMuscles = normalizeArray(row.primary_muscles);
    const secondaryMuscles = normalizeArray(row.secondary_muscles);

    const baseExercise = {
      index: index + 1,
      name: String(row.name ?? "").trim(),
      slug,
      equipment: String(row.equipment ?? "").trim(),
      movement_pattern: String(row.movement_pattern ?? "").trim(),
      measurement_type: String(row.measurement_type ?? "").trim(),
      default_unit: String(row.default_unit ?? "").trim(),
      calories_estimation_method: String(row.calories_estimation_method ?? "").trim(),
      primary_muscle: String(row.primary_muscle ?? "").trim(),
      primary_muscles: primaryMuscles,
      secondary_muscles: secondaryMuscles,
      image_howto_path: String(row.image_howto_path ?? "").trim(),
      image_muscles_path: String(row.image_muscles_path ?? "").trim(),
      how_to_short: String(row.how_to_short ?? "").trim(),
      curation_tags: curationTags,
      facet_tags: flattenCurationTagPairs(curationTags),
    };

    const exercise = {
      ...baseExercise,
      search_text: buildSearchText(baseExercise),
    };
    return {
      ...exercise,
      review_flags: buildReviewFlags(exercise),
    };
  });
  const reviewQueue = exercises
    .filter((exercise) => exercise.review_flags.length > 0)
    .map((exercise) => ({
      name: exercise.name,
      slug: exercise.slug,
      equipment: exercise.equipment,
      measurement_type: exercise.measurement_type,
      default_unit: exercise.default_unit,
      pattern_detail: exercise.curation_tags.pattern_detail?.[0] ?? "",
      review_flags: exercise.review_flags,
    }));
  const manualSpotChecks = buildManualSpotChecks(exercises);

  const summary = {
    generated_at: new Date().toISOString(),
    source_path: "supabase/data/global_exercises_canonical.json",
    exercise_count: exercises.length,
    coverage: buildCoverage(exercises),
    duplicates: {
      duplicate_names: countBy(exercises.map((exercise) => exercise.name)).filter((entry) => entry.count > 1),
      duplicate_slugs: countBy(exercises.map((exercise) => exercise.slug)).filter((entry) => entry.count > 1),
    },
    facets: {
      equipment: countBy(exercises.map((exercise) => exercise.equipment)),
      movement_pattern: countBy(exercises.map((exercise) => exercise.movement_pattern)),
      measurement_type: countBy(exercises.map((exercise) => exercise.measurement_type || "reps")),
      primary_muscle: countBy(exercises.map((exercise) => exercise.primary_muscle)),
      primary_muscles: countBy(exercises.flatMap((exercise) => exercise.primary_muscles)),
      secondary_muscles: countBy(exercises.flatMap((exercise) => exercise.secondary_muscles)),
      ...Object.fromEntries(CURATION_GROUPS.map((group) => [group, countBy(exercises.flatMap((exercise) => exercise.curation_tags[group] ?? []))])),
    },
    review_queue_count: reviewQueue.length,
    manual_spot_checks: manualSpotChecks,
    exercises,
  };

  const csvColumns = [
    "index",
    "name",
    "slug",
    "equipment",
    "movement_pattern",
    "measurement_type",
    "default_unit",
    "calories_estimation_method",
    "primary_muscle",
    "primary_muscles",
    "secondary_muscles",
    ...CURATION_GROUPS,
    "how_to_short",
  ];
  const csvLines = [
    csvColumns.join(","),
    ...exercises.map((exercise) => csvColumns.map((column) => {
      if (column === "primary_muscles") return csvEscape(exercise.primary_muscles.join(" | "));
      if (column === "secondary_muscles") return csvEscape(exercise.secondary_muscles.join(" | "));
      if (CURATION_GROUPS.includes(column)) return csvEscape((exercise.curation_tags[column] ?? []).join(" | "));
      return csvEscape(exercise[column] ?? "");
    }).join(",")),
  ];

  fs.writeFileSync(INDEX_JSON_PATH, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(INDEX_CSV_PATH, `${csvLines.join("\n")}\n`);
  fs.writeFileSync(REPORT_MD_PATH, `${buildMarkdownReport(summary)}\n`);
  fs.writeFileSync(REVIEW_JSON_PATH, `${JSON.stringify(reviewQueue, null, 2)}\n`);
  fs.writeFileSync(REVIEW_MD_PATH, `${buildReviewMarkdown(reviewQueue, manualSpotChecks)}\n`);

  console.log(`Analyzed ${exercises.length} exercises.`);
  console.log(`Wrote ${path.relative(ROOT, INDEX_JSON_PATH)}.`);
  console.log(`Wrote ${path.relative(ROOT, INDEX_CSV_PATH)}.`);
  console.log(`Wrote ${path.relative(ROOT, REPORT_MD_PATH)}.`);
  console.log(`Wrote ${path.relative(ROOT, REVIEW_JSON_PATH)}.`);
  console.log(`Wrote ${path.relative(ROOT, REVIEW_MD_PATH)}.`);
}

main();
