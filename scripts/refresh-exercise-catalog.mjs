import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const CANONICAL_PATH = path.join(ROOT, "supabase", "data", "global_exercises_canonical.json");
const MIGRATION_PATH = path.join(ROOT, "supabase", "migrations", "040_exercise_curation_tags_and_howto_refresh.sql");

const CURATION_GROUP_LABELS = {
  pattern_detail: "Pattern Detail",
  plane_of_motion: "Plane",
  exercise_utility: "Utility",
  body_position: "Body Position",
  training_goal: "Training Goal",
  difficulty: "Difficulty",
  setup_cost: "Setup Cost",
  stability_requirement: "Stability",
  unilateral_profile: "Unilateral",
  loading_profile: "Loading",
  joint_emphasis: "Joint Emphasis",
  spine_demand: "Spine Demand",
  grip_constraint: "Constraints",
};

const ALLOWED_EQUIPMENT = [
  "Barbell",
  "Bodyweight",
  "Cable",
  "Cardio Machine",
  "Dumbbell",
  "Machine",
  "Plate",
  "Sled",
  "Smith Machine",
];

const EQUIPMENT_NORMALIZATION = new Map([
  ["barbell", "Barbell"],
  ["bodyweight", "Bodyweight"],
  ["cable", "Cable"],
  ["cardio machine", "Cardio Machine"],
  ["dumbbell", "Dumbbell"],
  ["machine", "Machine"],
  ["plate", "Plate"],
  ["sled", "Sled"],
  ["smith machine", "Smith Machine"],
]);

const ADVANCED_NAME_HINTS = [
  "ab wheel",
  "bulgarian split squat",
  "hanging leg raise",
  "nordic curl",
  "pendlay row",
  "push press",
  "rack pull",
  "single-leg romanian deadlift",
  "snatch-grip deadlift",
  "tempo ",
  "paused ",
  "weighted ",
];

const BEGINNER_NAME_HINTS = [
  "adductor machine",
  "abductor machine",
  "air bike sprint",
  "calf raise",
  "chest press",
  "cable crunch",
  "curl",
  "face pull",
  "front raise",
  "incline walk",
  "jump rope",
  "leg extension",
  "leg press",
  "machine ",
  "pec deck",
  "pushdown",
  "rowing machine",
  "stair climber",
  "stationary bike",
  "stretch",
];

const CURATION_GROUP_KEYS = Object.keys(CURATION_GROUP_LABELS);

const PRESERVE_CANONICAL_METADATA_NAMES = new Set([
  "bodyweight squat",
  "bodyweight reverse lunge",
  "bodyweight walking lunge",
  "bodyweight step-up",
  "single-leg calf raise",
  "bodyweight glute bridge",
  "inverted row",
  "pike push-up",
  "assisted pull-up",
  "cable pull-through",
  "cable hip abduction",
  "cable hip adduction",
  "chest-supported dumbbell row",
  "cable woodchop",
  "half-kneeling cable chop",
  "half-kneeling pallof press",
  "bird dog",
  "side plank reach-through",
  "thoracic open book",
  "box jump",
  "squat jump",
  "burpee",
  "mountain climber",
  "sled drag",
  "backward sled drag",
  "plate halo",
  "plate russian twist",
  "smith machine incline bench press",
  "smith machine romanian deadlift",
  "smith machine hip thrust",
  "machine pulldown",
]);

const CARDIO_PATTERN_DETAILS = new Set([
  "running",
  "walking",
  "cycling",
  "rowing",
  "step_cardio",
  "rope_skip",
  "sled_drive",
  "full_body_conditioning",
  "locomotion_drill",
]);

function readCanonicalExercises() {
  return JSON.parse(fs.readFileSync(CANONICAL_PATH, "utf8"));
}

function writeCanonicalExercises(exercises) {
  fs.writeFileSync(CANONICAL_PATH, `${JSON.stringify(exercises, null, 2)}\n`);
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniq(value.map((item) => String(item ?? "").trim()).filter(Boolean));
}

function normalizeExistingCurationTags(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(CURATION_GROUP_KEYS.map((key) => [key, normalizeList(source[key])]));
}

function hasCompleteCurationTags(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return CURATION_GROUP_KEYS.every((key) => Array.isArray(value[key]));
}

function shouldPreserveCanonicalMetadata(name) {
  return PRESERVE_CANONICAL_METADATA_NAMES.has(name);
}

function normalizeEquipment(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  const resolved = EQUIPMENT_NORMALIZATION.get(normalized.toLowerCase()) ?? normalized;
  if (!ALLOWED_EQUIPMENT.includes(resolved)) {
    throw new Error(`Unsupported equipment category: ${resolved}`);
  }

  return resolved;
}

function toNameKey(name) {
  return String(name ?? "").trim().toLowerCase();
}

function hasToken(name, token) {
  return name.includes(token);
}

function hasAnyToken(name, tokens) {
  return tokens.some((token) => hasToken(name, token));
}

function isCardioExercise(row, name) {
  return String(row.primary_muscle ?? "").trim().toLowerCase() === "cardio"
    || String(row.equipment ?? "").trim().toLowerCase() === "cardio machine"
    || name === "sled push"
    || name === "jump rope"
    || name === "burpee"
    || name === "mountain climber";
}

function resolvePatternDetail(row, name) {
  if (name === "stretch") return "mobility_drill";
  if (name === "thoracic open book") return "mobility_drill";
  if (hasAnyToken(name, ["bird dog", "half-kneeling pallof press"])) return "anti_rotation";
  if (hasAnyToken(name, ["cable woodchop", "half-kneeling cable chop", "side plank reach-through", "plate russian twist"])) return "trunk_rotation";
  if (hasAnyToken(name, ["box jump", "squat jump"])) return "plyometric_jump";
  if (name === "burpee") return "full_body_conditioning";
  if (name === "mountain climber") return "locomotion_drill";
  if (hasAnyToken(name, ["sled drag", "backward sled drag"])) return "sled_drag";
  if (name === "plate halo") return "shoulder_circumduction";
  if (hasAnyToken(name, ["treadmill run", "incline walk"])) return name === "treadmill run" ? "running" : "walking";
  if (hasAnyToken(name, ["stationary bike", "air bike sprint"])) return "cycling";
  if (name === "rowing machine") return "rowing";
  if (name === "stair climber") return "step_cardio";
  if (name === "jump rope") return "rope_skip";
  if (name === "sled push") return "sled_drive";
  if (hasAnyToken(name, ["plank", "hollow body hold", "dead bug", "ab wheel rollout", "weighted plank"])) return "trunk_bracing";
  if (name === "pallof press") return "anti_rotation";
  if (name === "russian twist") return "trunk_rotation";
  if (hasAnyToken(name, ["crunch"])) return "trunk_flexion";
  if (hasAnyToken(name, ["leg raise"])) return "leg_raise";
  if (hasAnyToken(name, ["calf raise"])) return "plantar_flexion";
  if (hasAnyToken(name, ["leg extension"])) return "knee_extension";
  if (hasAnyToken(name, ["leg curl", "nordic curl"])) return "knee_flexion";
  if (hasAnyToken(name, ["abductor"])) return "hip_abduction";
  if (hasAnyToken(name, ["adductor"])) return "hip_adduction";
  if (name.includes("kickback") && String(row.primary_muscle ?? "").toLowerCase().includes("glute")) return "hip_extension";
  if (hasAnyToken(name, ["glute bridge", "hip thrust", "reverse hyperextension", "back extension"])) return "hip_extension";
  if (hasAnyToken(name, ["lateral raise"])) return "shoulder_abduction";
  if (hasAnyToken(name, ["front raise"])) return "shoulder_flexion";
  if (hasAnyToken(name, ["rear delt fly", "reverse pec deck"])) return "shoulder_horizontal_abduction";
  if (hasAnyToken(name, ["fly", "pec deck"])) return "chest_fly";
  if (hasAnyToken(name, ["curl"])) return "elbow_flexion";
  if (hasAnyToken(name, ["pushdown", "skullcrusher", "triceps extension"]) || (name.includes("kickback") && String(row.primary_muscle ?? "").toLowerCase().includes("tricep"))) return "elbow_extension";
  if (hasAnyToken(name, ["pull-up", "chin-up", "pulldown"])) return "vertical_pull";
  if (hasAnyToken(name, ["row", "face pull"])) return "horizontal_pull";
  if (hasAnyToken(name, ["split squat", "lunge", "step-up"])) return "split_squat_lunge";
  if (hasAnyToken(name, ["squat", "leg press"])) return "squat";
  if (hasAnyToken(name, ["deadlift", "rack pull", "romanian", "stiff-leg", "pull-through"])) return "hinge";
  if (hasAnyToken(name, ["press"])) {
    if (hasAnyToken(name, ["bench", "chest press", "push-up", "dips"])) return "horizontal_push";
    return "vertical_push";
  }

  if (row.movement_pattern === "pull") return "horizontal_pull";
  if (row.movement_pattern === "squat") return "squat";
  if (row.movement_pattern === "hinge") return "hinge";
  return "horizontal_push";
}

function resolveTrainingGoals(row, name, patternDetail, cardio) {
  if (name === "stretch") return ["mobility", "recovery"];
  if (cardio) {
    return name === "air bike sprint" || name === "sled push"
      ? ["conditioning", "power"]
      : ["conditioning", "endurance"];
  }
  if (patternDetail === "anti_rotation" || patternDetail === "trunk_bracing") {
    return ["core_stability", "accessory"];
  }
  if (hasAnyToken(name, ["paused ", "tempo ", "weighted "])) {
    return ["strength", "skill"];
  }
  if (hasAnyToken(name, ["squat", "deadlift", "bench press", "overhead press", "row", "pull-up", "chin-up"])) {
    return ["strength", "hypertrophy"];
  }

  return ["hypertrophy", "accessory"];
}

function resolvePlaneOfMotion(row, name, patternDetail) {
  if (name === "stretch") return "multi_planar";
  if (name.includes("side plank")) return "frontal";

  switch (patternDetail) {
    case "hip_abduction":
    case "hip_adduction":
    case "shoulder_abduction":
      return "frontal";
    case "anti_rotation":
    case "trunk_rotation":
    case "chest_fly":
    case "shoulder_horizontal_abduction":
      return "transverse";
    case "shoulder_circumduction":
      return "multi_planar";
    case "mobility_drill":
      return "multi_planar";
    default:
      return "sagittal";
  }
}

function resolveExerciseUtility(row, name, patternDetail, cardio) {
  if (name === "stretch") return "preparatory";
  if (cardio) return "basic";

  if ([
    "horizontal_push",
    "vertical_push",
    "horizontal_pull",
    "vertical_pull",
    "hinge",
    "squat",
    "full_body_conditioning",
    "locomotion_drill",
    "sled_drag",
  ].includes(patternDetail)) {
    return "basic";
  }

  if ([
    "elbow_flexion",
    "elbow_extension",
    "shoulder_abduction",
    "shoulder_horizontal_abduction",
    "shoulder_flexion",
    "chest_fly",
    "knee_extension",
    "knee_flexion",
    "hip_abduction",
    "hip_adduction",
    "plantar_flexion",
    "trunk_flexion",
  ].includes(patternDetail)) {
    return "isolation";
  }

  return "auxiliary";
}

function resolveBodyPosition(row, name, patternDetail) {
  if (name === "stretch") return "variable";
  if (name === "plank" || name === "weighted plank") return "prone";
  if (name === "side plank") return "side_lying";
  if (hasAnyToken(name, ["hollow body hold", "dead bug", "lying leg raise"])) return "supine";
  if (name === "cable crunch") return "kneeling";
  if (hasAnyToken(name, ["back extension", "reverse hyperextension", "lying leg curl"])) return "prone";
  if (name === "seated leg curl") return "seated";
  if (name === "donkey calf raise") return "supported";
  if (hasAnyToken(name, ["pull-up", "chin-up", "hanging leg raise"])) return "hanging";
  if (name === "ab wheel rollout") return "kneeling";
  if (hasAnyToken(name, ["walking lunge", "reverse lunge", "bulgarian split squat", "split squat", "step-up"])) return "split_stance";
  if (hasAnyToken(name, ["bench press", "dumbbell fly", "skullcrusher", "dead bug", "lying leg raise", "glute bridge", "hip thrust"])) return "supine";
  if (hasAnyToken(name, ["seated ", "pec deck", "machine crunch", "rowing machine", "stationary bike"])) return "seated";
  if (hasAnyToken(name, ["chest-supported row"])) return "prone";
  if (patternDetail === "step_cardio" || patternDetail === "running" || patternDetail === "walking" || patternDetail === "rope_skip" || patternDetail === "sled_drive") {
    return "standing";
  }

  if (String(row.equipment ?? "").toLowerCase() === "machine" && !name.includes("standing")) {
    return "seated";
  }

  return "standing";
}

function resolveDifficulty(row, name, cardio) {
  if (name === "stretch") return "beginner";
  if (hasAnyToken(name, ADVANCED_NAME_HINTS)) return "advanced";
  if (cardio || String(row.equipment ?? "").toLowerCase() === "machine" || hasAnyToken(name, BEGINNER_NAME_HINTS)) {
    return "beginner";
  }
  return "intermediate";
}

function resolveSetupCost(row, name, cardio) {
  const equipment = String(row.equipment ?? "").toLowerCase();
  if (name === "stretch") return "quick_setup";
  if (equipment === "barbell" || equipment === "smith machine" || hasAnyToken(name, ["weighted pull-up", "bench press", "front squat", "back squat", "deadlift"])) {
    return "high_setup";
  }
  if (cardio || equipment === "machine" || equipment === "bodyweight" || equipment === "dumbbell") {
    return "quick_setup";
  }
  return "moderate_setup";
}

function resolveStabilityRequirement(row, name, patternDetail) {
  const equipment = String(row.equipment ?? "").toLowerCase();
  if (hasAnyToken(name, ["pull-up", "chin-up", "hanging leg raise"])) return "hanging";
  if (hasAnyToken(name, ["single-leg romanian deadlift", "walking lunge", "step-up", "bulgarian split squat"])) return "balance_demanding";
  if (hasAnyToken(name, ["single-arm dumbbell bench press", "single-arm cable row", "single-arm dumbbell row", "single-arm lat pulldown"])) return "single_arm";
  if (equipment === "machine" || equipment === "cardio machine" || equipment === "smith machine" || hasAnyToken(name, ["chest-supported row", "seated ", "lying ", "bench press", "pec deck"])) {
    return "supported";
  }
  if (patternDetail === "split_squat_lunge") return "single_leg";
  return "freestanding";
}

function resolveUnilateralProfile(name, patternDetail) {
  if (hasAnyToken(name, ["single-arm", "single-leg", "bulgarian split squat", "reverse lunge", "walking lunge", "step-up", "single-leg press"])) {
    return "unilateral";
  }
  if (hasAnyToken(name, ["alternating"])) return "alternating";
  if (patternDetail === "split_squat_lunge") return "unilateral";
  return "bilateral";
}

function resolveLoadingProfile(row, cardio) {
  const equipment = String(row.equipment ?? "").toLowerCase();
  if (equipment === "cardio machine") return "cardio_machine";
  if (equipment === "sled") return "sled_loaded";
  if (equipment === "bodyweight") return "bodyweight";
  if (equipment === "cable") return "cable_loaded";
  if (equipment === "machine" || equipment === "smith machine") return "machine_loaded";
  return "free_weight";
}

function resolveJointEmphasis(patternDetail) {
  switch (patternDetail) {
    case "horizontal_push":
      return "horizontal_press";
    case "vertical_push":
      return "vertical_press";
    case "horizontal_pull":
      return "horizontal_pull";
    case "vertical_pull":
      return "vertical_pull";
    case "elbow_flexion":
      return "elbow_flexion";
    case "elbow_extension":
      return "elbow_extension";
    case "shoulder_abduction":
      return "shoulder_abduction";
    case "shoulder_horizontal_abduction":
      return "shoulder_horizontal_abduction";
    case "shoulder_flexion":
      return "shoulder_flexion";
    case "chest_fly":
      return "shoulder_horizontal_adduction";
    case "squat":
    case "split_squat_lunge":
    case "knee_extension":
      return "knee_dominant";
    case "hinge":
    case "hip_extension":
    case "knee_flexion":
      return "hip_dominant";
    case "hip_abduction":
      return "hip_abduction";
    case "hip_adduction":
      return "hip_adduction";
    case "trunk_flexion":
      return "trunk_flexion";
    case "trunk_bracing":
    case "anti_rotation":
      return "trunk_bracing";
    case "trunk_rotation":
      return "trunk_rotation";
    case "plantar_flexion":
      return "plantar_flexion";
    case "running":
    case "walking":
    case "cycling":
    case "rowing":
    case "step_cardio":
    case "rope_skip":
    case "sled_drive":
    case "full_body_conditioning":
    case "locomotion_drill":
    case "sled_drag":
      return "cyclical_conditioning";
    case "plyometric_jump":
      return "knee_dominant";
    case "shoulder_circumduction":
      return "shoulder_flexion";
    default:
      return "general_strength";
  }
}

function resolveSpineDemand(row, name, patternDetail) {
  if (name === "stretch") return "low_spinal_load";
  if (hasAnyToken(name, ["back squat", "front squat", "deadlift", "overhead press", "push press", "pendlay row", "snatch-grip deadlift", "tempo deadlift", "paused deadlift"])) {
    return "high_spinal_load";
  }
  if (hasAnyToken(name, ["romanian deadlift", "walking lunge", "reverse lunge", "goblet squat", "single-leg romanian deadlift", "bulgarian split squat", "step-up", "t-bar row"])) {
    return "moderate_spinal_load";
  }
  if (hasAnyToken(name, ["chest-supported row"])) return "chest_supported";
  if (patternDetail === "trunk_bracing" || patternDetail === "anti_rotation") return "low_spinal_load";
  return "low_spinal_load";
}

function resolveGripConstraints(name, patternDetail) {
  const constraints = [];
  if (hasAnyToken(name, ["close-grip"])) constraints.push("close_grip");
  if (hasAnyToken(name, ["wide-grip"])) constraints.push("wide_grip");
  if (hasAnyToken(name, ["neutral-grip"])) constraints.push("neutral_grip");
  if (hasAnyToken(name, ["reverse-grip", "chin-up"])) constraints.push("supinated_grip");
  if (hasAnyToken(name, ["front squat"])) constraints.push("front_rack");
  if (hasAnyToken(name, ["overhead press", "shoulder press", "push press"])) constraints.push("overhead_lockout");
  if (hasAnyToken(name, ["pull-up", "chin-up", "hanging leg raise"])) constraints.push("hanging");
  if (patternDetail === "vertical_pull" && !constraints.includes("hanging") && hasAnyToken(name, ["pulldown"])) {
    constraints.push("shoulder_depression");
  }
  return uniq(constraints);
}

function buildMuscleMetadata(primary_muscle, primary_muscles, secondary_muscles) {
  return {
    primary_muscle,
    primary_muscles,
    secondary_muscles,
  };
}

function normalizeExistingMuscleMetadata(row) {
  const primaryMuscles = normalizeList(row.primary_muscles);
  const secondaryMuscles = normalizeList(row.secondary_muscles);
  const primaryMuscle = String(row.primary_muscle ?? "").trim() || primaryMuscles.join(", ");

  return buildMuscleMetadata(primaryMuscle, primaryMuscles, secondaryMuscles);
}

function resolveCardioSecondaryMuscles(name, patternDetail) {
  if (patternDetail === "rope_skip") return ["calves"];
  if (patternDetail === "running") return ["quads", "calves"];
  if (patternDetail === "walking") return ["glutes", "quads"];
  if (patternDetail === "cycling" || patternDetail === "step_cardio") return ["quads", "glutes"];
  if (patternDetail === "rowing") return ["lats", "quads"];
  if (patternDetail === "sled_drive") return ["quads", "glutes"];
  if (name === "burpee") return ["chest", "triceps", "quads", "glutes", "core"];
  if (name === "mountain climber") return ["core", "hip flexors", "shoulders"];
  return [];
}

function resolveMuscleMetadata(row, name, patternDetail, curationTags) {
  if (shouldPreserveCanonicalMetadata(name)) {
    return normalizeExistingMuscleMetadata(row);
  }

  if (name === "stretch") {
    return normalizeExistingMuscleMetadata(row);
  }

  if (patternDetail === "horizontal_pull" && hasAnyToken(name, ["face pull", "upright row"])) {
    return normalizeExistingMuscleMetadata(row);
  }

  const loadingProfile = curationTags.loading_profile?.[0] ?? resolveLoadingProfile(row, false);
  const bodyPosition = curationTags.body_position?.[0] ?? resolveBodyPosition(row, name, patternDetail);
  const freeOrBodyweightLower = loadingProfile === "free_weight" || loadingProfile === "bodyweight";

  switch (patternDetail) {
    case "elbow_flexion":
      return buildMuscleMetadata(
        "biceps",
        ["biceps"],
        hasAnyToken(name, ["hammer curl", "cross-body hammer curl"]) ? ["forearms"] : [],
      );
    case "elbow_extension":
      return buildMuscleMetadata("triceps", ["triceps"], []);
    case "horizontal_push":
      return buildMuscleMetadata("chest, triceps", ["chest", "triceps"], ["front delts"]);
    case "chest_fly":
      return buildMuscleMetadata("chest", ["chest"], ["front delts"]);
    case "vertical_push":
      return buildMuscleMetadata(
        "front delts, triceps",
        ["front delts", "triceps"],
        row.equipment === "Barbell" && bodyPosition !== "seated" ? ["side delts", "core"] : ["side delts"],
      );
    case "shoulder_abduction":
      return buildMuscleMetadata("side delts", ["side delts"], ["upper traps"]);
    case "shoulder_horizontal_abduction":
      return buildMuscleMetadata("rear delts", ["rear delts"], ["upper back"]);
    case "shoulder_flexion":
      return buildMuscleMetadata("front delts", ["front delts"], ["upper traps"]);
    case "vertical_pull":
      return buildMuscleMetadata(
        "lats, upper back",
        ["lats", "upper back"],
        row.equipment === "Bodyweight" && bodyPosition === "hanging" ? ["biceps", "core"] : ["biceps"],
      );
    case "horizontal_pull":
      return buildMuscleMetadata("lats, mid back", ["lats", "mid back"], ["rear delts", "biceps"]);
    case "squat":
      return buildMuscleMetadata(
        "quads, glutes",
        ["quads", "glutes"],
        freeOrBodyweightLower ? ["core", "adductors"] : ["adductors"],
      );
    case "split_squat_lunge":
      return buildMuscleMetadata("quads, glutes", ["quads", "glutes"], ["adductors", "core"]);
    case "hinge":
      return buildMuscleMetadata("glutes, hamstrings, lower back", ["glutes", "hamstrings", "lower back"], ["core"]);
    case "hip_extension":
      return buildMuscleMetadata("glutes", ["glutes"], ["hamstrings", "core"]);
    case "knee_extension":
      return buildMuscleMetadata("quads", ["quads"], []);
    case "knee_flexion":
      return buildMuscleMetadata("hamstrings", ["hamstrings"], ["calves"]);
    case "hip_abduction":
      return buildMuscleMetadata("abductors, glutes", ["abductors", "glutes"], ["core"]);
    case "hip_adduction":
      return buildMuscleMetadata("adductors", ["adductors"], ["core"]);
    case "plantar_flexion":
      return buildMuscleMetadata("calves", ["calves"], []);
    case "trunk_bracing":
    case "anti_rotation":
      return buildMuscleMetadata(
        "core",
        ["core"],
        hasAnyToken(name, ["hollow body hold", "dead bug", "ab wheel rollout"]) ? ["hip flexors"] : [],
      );
    case "trunk_flexion":
    case "trunk_rotation":
      return buildMuscleMetadata("core", ["core"], []);
    case "leg_raise":
      return buildMuscleMetadata("core", ["core"], ["hip flexors"]);
    default:
      if (CARDIO_PATTERN_DETAILS.has(patternDetail)) {
        return buildMuscleMetadata("cardio", ["cardio"], resolveCardioSecondaryMuscles(name, patternDetail));
      }

      return normalizeExistingMuscleMetadata(row);
  }
}

function buildCurationTags(row) {
  const name = toNameKey(row.name);
  if (shouldPreserveCanonicalMetadata(name) && hasCompleteCurationTags(row.curation_tags)) {
    return normalizeExistingCurationTags(row.curation_tags);
  }

  const cardio = isCardioExercise(row, name);
  const patternDetail = resolvePatternDetail(row, name);

  return {
    pattern_detail: [patternDetail],
    plane_of_motion: [resolvePlaneOfMotion(row, name, patternDetail)],
    exercise_utility: [resolveExerciseUtility(row, name, patternDetail, cardio)],
    body_position: [resolveBodyPosition(row, name, patternDetail)],
    training_goal: resolveTrainingGoals(row, name, patternDetail, cardio),
    difficulty: [resolveDifficulty(row, name, cardio)],
    setup_cost: [resolveSetupCost(row, name, cardio)],
    stability_requirement: [resolveStabilityRequirement(row, name, patternDetail)],
    unilateral_profile: [resolveUnilateralProfile(name, patternDetail)],
    loading_profile: [resolveLoadingProfile(row, cardio)],
    joint_emphasis: [resolveJointEmphasis(patternDetail)],
    spine_demand: [resolveSpineDemand(row, name, patternDetail)],
    grip_constraint: resolveGripConstraints(name, patternDetail),
  };
}

function resolveMeasurementMetadata(row, curationTags) {
  const name = toNameKey(row.name);
  if (shouldPreserveCanonicalMetadata(name) && row.measurement_type && row.default_unit) {
    return {
      measurement_type: String(row.measurement_type).trim(),
      default_unit: String(row.default_unit).trim(),
      calories_estimation_method: row.calories_estimation_method ?? null,
    };
  }

  const patternDetail = curationTags.pattern_detail[0];
  const isTimedHold = name === "stretch"
    || name.includes("plank")
    || name.includes("hold")
    || name === "hollow body hold";

  if (patternDetail === "running" || patternDetail === "walking" || patternDetail === "cycling" || patternDetail === "rowing") {
    return {
      measurement_type: "time_distance",
      default_unit: "m",
      calories_estimation_method: String(row.equipment ?? "") === "Cardio Machine" ? "machine_reported" : null,
    };
  }

  if (patternDetail === "step_cardio" || patternDetail === "rope_skip" || isTimedHold) {
    return {
      measurement_type: "time",
      default_unit: "s",
      calories_estimation_method: String(row.equipment ?? "") === "Cardio Machine" ? "machine_reported" : null,
    };
  }

  if (patternDetail === "sled_drive") {
    return {
      measurement_type: "distance",
      default_unit: "m",
      calories_estimation_method: null,
    };
  }

  return {
    measurement_type: "reps",
    default_unit: "reps",
    calories_estimation_method: null,
  };
}

function buildHowTo(row, curationTags) {
  const name = toNameKey(row.name);
  if (shouldPreserveCanonicalMetadata(name) && String(row.how_to_short ?? "").trim()) {
    return String(row.how_to_short).trim();
  }

  const patternDetail = curationTags.pattern_detail[0];
  const loadingProfile = curationTags.loading_profile[0];

  if (name === "stretch") {
    return "Move through the intended stretch or mobility drill under control, breathe steadily, and stop short of any position that forces pain or joint compensation.";
  }

  if (name === "air bike sprint") {
    return "Drive the handles and pedals aggressively with a rigid trunk, hold the target effort for the interval, and ease down under control when the work ends.";
  }

  if (patternDetail === "running") {
    return "Set the pace and incline, stay tall through the torso, and keep each stride smooth from foot strike through push-off.";
  }

  if (patternDetail === "walking") {
    return "Set the pace and incline, keep your posture tall, and walk with a smooth controlled stride instead of hanging on the rails.";
  }

  if (patternDetail === "cycling") {
    return "Set the resistance, pedal at a steady cadence with a quiet upper body, and keep pressure balanced through the full pedal stroke.";
  }

  if (patternDetail === "rowing") {
    return "Drive through the legs first, finish the pull with hips and arms in sequence, and recover smoothly back to the catch.";
  }

  if (patternDetail === "step_cardio") {
    return "Stand tall, step through each stride with full foot contact, and keep the pace steady without pulling on the rails.";
  }

  if (patternDetail === "rope_skip") {
    return "Stay tall, jump only high enough to clear the rope, and turn it from the wrists while keeping a steady rhythm.";
  }

  if (patternDetail === "sled_drive") {
    return "Lean into the handles with a rigid trunk, drive the sled with short powerful steps, and keep the feet pushing straight through the floor.";
  }

  if (patternDetail === "trunk_bracing") {
    if (hasAnyToken(name, ["ab wheel rollout"])) {
      return "Brace hard before you roll, reach only as far as you can keep ribs and pelvis stacked, then pull back without letting the low back sag.";
    }

    return "Brace the trunk, keep the ribs stacked over the pelvis, and hold the position without letting the low back arch or the torso rotate.";
  }

  if (patternDetail === "anti_rotation") {
    return "Brace through the trunk, press the handle straight out without letting the torso twist, and return under control.";
  }

  if (patternDetail === "trunk_rotation") {
    return "Rotate the ribcage as a unit from side to side, keep the hips quiet, and control the range instead of throwing the load with the arms.";
  }

  if (patternDetail === "trunk_flexion") {
    return "Brace first, curl the ribcage toward the pelvis through the abs, and return without yanking through the neck or hips.";
  }

  if (patternDetail === "leg_raise") {
    return "Posteriorly tilt the pelvis, raise the legs without swinging, and lower only as far as you can keep the trunk braced.";
  }

  if (patternDetail === "hip_extension") {
    return "Brace, drive through the heels, extend the hips until the ribs stay stacked, and lower without arching the low back.";
  }

  if (patternDetail === "knee_extension") {
    return "Set the pad just above the ankles, extend the knees through full range without kicking, and lower under control.";
  }

  if (patternDetail === "knee_flexion") {
    return "Set the hips firmly into the pad, curl the heels toward you without lifting the pelvis, and lower slowly through the full range.";
  }

  if (patternDetail === "hip_abduction") {
    return "Sit tall with the hips square, press the knees outward from the hip joint, and return without bouncing off the stack.";
  }

  if (patternDetail === "hip_adduction") {
    return "Sit upright with the pelvis still, squeeze the legs inward through the pads, and return under control.";
  }

  if (patternDetail === "plantar_flexion") {
    return "Move through a full ankle stretch, rise onto the ball of the foot, pause at the top, and lower under control.";
  }

  if (patternDetail === "elbow_flexion") {
    return "Keep the upper arm quiet, curl the load toward shoulder height, and lower without letting the torso sway or the shoulders roll forward.";
  }

  if (patternDetail === "elbow_extension") {
    return "Pin the upper arm in place, extend the elbow to full lockout, and return with control instead of letting the weight yank you back.";
  }

  if (patternDetail === "shoulder_abduction") {
    return "Raise the load out to shoulder height with a soft elbow, keep the shoulders down, and lower without swinging.";
  }

  if (patternDetail === "shoulder_horizontal_abduction") {
    return "Set the shoulders down, sweep the arms out and back in line with the rear delts, and return without shrugging or jutting the ribs forward.";
  }

  if (patternDetail === "shoulder_flexion") {
    return "Lift the load in front to shoulder height without leaning back, pause briefly, and lower under control.";
  }

  if (patternDetail === "chest_fly") {
    return "Keep a soft elbow bend, open through the chest until the shoulders stay packed, then bring the handles or bells back together with control.";
  }

  if (patternDetail === "vertical_pull") {
    if (hasAnyToken(name, ["lat pulldown"])) {
      return "Set the shoulders down first, pull the bar toward the upper chest by driving the elbows to your sides, and return to full reach without shrugging.";
    }

    return "Start from a full hang or reach, pull the elbows toward the ribs until the bar comes to you, and lower to full extension under control.";
  }

  if (patternDetail === "horizontal_pull") {
    if (hasAnyToken(name, ["face pull"])) {
      return "Pull the rope toward eye level with elbows high, finish by rotating the hands back, and return without letting the ribs flare.";
    }

    return "Brace the torso, pull the load toward the lower ribs or hip, squeeze the upper back, and return without letting the shoulders dump forward.";
  }

  if (patternDetail === "horizontal_push") {
    if (hasAnyToken(name, ["dips"])) {
      return "Support your body with the shoulders packed, lower until the upper arm reaches your controlled depth, and press back to lockout without swinging.";
    }

    if (hasAnyToken(name, ["push-up"])) {
      return "Brace from head to heels, lower under control through your available range, and press back up without losing shoulder or trunk position.";
    }

    return "Set the shoulders back and down, lower the load to the chest or handles with stacked wrists, and press to full elbow extension under control.";
  }

  if (patternDetail === "vertical_push") {
    if (name === "push press") {
      return "Dip straight down, drive through the legs to transfer force into the load, and finish overhead with the trunk braced and elbows locked.";
    }

    return "Brace the trunk, press the load overhead on a controlled path, and finish with the ribs stacked over the hips instead of leaning back.";
  }

  if (patternDetail === "squat") {
    if (hasAnyToken(name, ["paused "])) {
      return "Brace hard, descend to your target depth, pause without losing position, and drive up through the whole foot.";
    }
    if (hasAnyToken(name, ["tempo "])) {
      return "Brace hard, control the descent at the prescribed cadence, stay balanced through the foot, and stand without rushing out of the bottom.";
    }

    return "Brace the trunk, descend by sitting between the hips while keeping pressure through the whole foot, and drive up through mid-foot.";
  }

  if (patternDetail === "split_squat_lunge") {
    return "Stay tall through the trunk, lower until the lead leg takes the load and the back knee approaches the floor, then drive through the front foot.";
  }

  if (patternDetail === "hinge") {
    if (hasAnyToken(name, ["romanian", "stiff-leg"])) {
      return "Unlock the knees, hinge the hips back with the load close to the body, and extend through the hips to stand tall.";
    }
    if (hasAnyToken(name, ["rack pull"])) {
      return "Brace hard, pull the bar from the pins with it kept close to the body, and lock out the hips without leaning back.";
    }
    if (hasAnyToken(name, ["paused "])) {
      return "Brace, keep the bar close as you hinge and pull, pause at the intended position without losing tension, and finish the rep under control.";
    }
    if (hasAnyToken(name, ["tempo "])) {
      return "Brace hard, keep the bar close through the pull, and control each phase of the lift at the prescribed cadence.";
    }

    return "Brace hard, keep the load close as you hinge and drive through the floor, and lock out the hips without overextending the low back.";
  }

  if (loadingProfile === "machine_loaded") {
    return "Set the machine so the joint lines up correctly, move through a full controlled range, and avoid using momentum to finish the rep.";
  }

  return row.how_to_short;
}

function normalizeExerciseRow(row) {
  const equipment = normalizeEquipment(row.equipment);
  const curationTags = buildCurationTags({ ...row, equipment });
  const measurementMetadata = resolveMeasurementMetadata({ ...row, equipment }, curationTags);
  const muscleMetadata = resolveMuscleMetadata({ ...row, equipment }, toNameKey(row.name), curationTags.pattern_detail[0], curationTags);

  return {
    ...row,
    equipment,
    primary_muscle: muscleMetadata.primary_muscle,
    primary_muscles: muscleMetadata.primary_muscles,
    secondary_muscles: muscleMetadata.secondary_muscles,
    measurement_type: measurementMetadata.measurement_type,
    default_unit: measurementMetadata.default_unit,
    calories_estimation_method: measurementMetadata.calories_estimation_method,
    curation_tags: curationTags,
    how_to_short: buildHowTo({ ...row, equipment }, curationTags),
  };
}

function sortExercises(exercises) {
  return [...exercises].sort((left, right) => left.name.localeCompare(right.name));
}

function sqlString(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildMigration(exercises) {
  const lines = [];
  lines.push("-- 040_exercise_curation_tags_and_howto_refresh.sql");
  lines.push("-- Generated from supabase/data/global_exercises_canonical.json via scripts/refresh-exercise-catalog.mjs.");
  lines.push("");
  lines.push("ALTER TABLE public.exercises");
  lines.push("  ADD COLUMN IF NOT EXISTS curation_tags jsonb NOT NULL DEFAULT '{}'::jsonb;");
  lines.push("");

  for (const row of exercises) {
    const escapedJson = JSON.stringify(row.curation_tags).replace(/'/g, "''");
    lines.push("UPDATE public.exercises SET");
    lines.push(`  equipment = ${sqlString(row.equipment)},`);
    lines.push(`  measurement_type = ${sqlString(row.measurement_type)},`);
    lines.push(`  default_unit = ${sqlString(row.default_unit)},`);
    lines.push(`  calories_estimation_method = ${sqlString(row.calories_estimation_method)},`);
    lines.push(`  how_to_short = ${sqlString(row.how_to_short)},`);
    lines.push(`  curation_tags = '${escapedJson}'::jsonb`);
    lines.push("WHERE is_global = TRUE");
    lines.push(`  AND lower(btrim(name)) = lower(btrim(${sqlString(row.name)}));`);
    lines.push("");
  }

  lines.push("-- Verification:");
  lines.push("-- SELECT name, jsonb_object_keys(curation_tags) FROM public.exercises WHERE is_global = TRUE LIMIT 20;");
  lines.push("-- SELECT count(*) FROM public.exercises WHERE is_global = TRUE AND (how_to_short IS NULL OR btrim(how_to_short) = '');");
  return `${lines.join("\n")}\n`;
}

function main() {
  const source = readCanonicalExercises();
  const next = sortExercises(source.map(normalizeExerciseRow));
  writeCanonicalExercises(next);
  fs.writeFileSync(MIGRATION_PATH, buildMigration(next));

  console.log(`Refreshed ${next.length} exercises.`);
  console.log(`Updated ${path.relative(ROOT, CANONICAL_PATH)}.`);
  console.log(`Wrote ${path.relative(ROOT, MIGRATION_PATH)}.`);
  console.log(`Curation groups: ${Object.values(CURATION_GROUP_LABELS).join(", ")}`);
}

main();
