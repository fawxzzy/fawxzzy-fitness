import fs from "node:fs";
import path from "node:path";

const SENTINEL_EXERCISE_ID = "66666666-6666-6666-6666-666666666666";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const optionsPath = path.resolve(process.cwd(), "src/lib/exercise-options.ts");
const source = fs.readFileSync(optionsPath, "utf8");

const idMatches = [...source.matchAll(/\bid:\s*"([0-9a-f-]{36})"/gi)].map((match) => match[1]);

if (!idMatches.length) {
  throw new Error("No exercise fixture IDs found in src/lib/exercise-options.ts");
}

const invalidIds = idMatches.filter((id) => id === SENTINEL_EXERCISE_ID || !UUID_PATTERN.test(id));

if (invalidIds.length > 0) {
  throw new Error(`Exercise fixtures contain invalid/sentinel IDs: ${invalidIds.join(", ")}`);
}

console.log(`validate-exercise-browser-fixtures: OK (${idMatches.length} fixture IDs checked)`);
