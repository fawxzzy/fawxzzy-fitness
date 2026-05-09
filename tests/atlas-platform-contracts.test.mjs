import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const atlasRoot = path.resolve(repoRoot, "..", "..");
const localSchemaRoot = path.join(atlasRoot, "packages", "atlas-contracts", "schemas");
const packageJsonPath = path.join(repoRoot, "package.json");
const commandsDocPath = path.join(repoRoot, "docs", "COMMANDS.md");
const adoptionDocPath = path.join(repoRoot, "docs", "ops", "FITNESS-ATLAS-CONTRACT-ADOPTION.md");
const workflowPath = path.join(repoRoot, ".github", "workflows", "atlas-contracts.yml");

const ATLAS_CONTRACTS_REF = "b48f820d3eca094800c2f3ccb36901dadfd259a9";
const SCHEMA_BASE_URL =
  `https://raw.githubusercontent.com/fawxzzy/ATLAS/${ATLAS_CONTRACTS_REF}/packages/atlas-contracts/schemas`;

const contractPlan = [
  {
    schemaFile: "atlas.app-registration.v1.schema.json",
    exportFile: "fitness.atlas.app-registration.v1.json",
  },
  {
    schemaFile: "atlas.env.v1.schema.json",
    exportFile: "fitness.atlas.env.v1.json",
  },
  {
    schemaFile: "atlas.health.v1.schema.json",
    exportFile: "fitness.atlas.health.v1.json",
  },
  {
    schemaFile: "atlas.event.v1.schema.json",
    exportFile: "fitness.atlas.event.v1.json",
  },
  {
    schemaFile: "atlas.receipt.v1.schema.json",
    exportFile: "fitness.atlas.receipt.v1.json",
  },
];

const isoDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function loadSchema(schemaFile) {
  const localPath = path.join(localSchemaRoot, schemaFile);
  if (fs.existsSync(localPath)) {
    return loadJson(localPath);
  }

  const response = await fetch(`${SCHEMA_BASE_URL}/${schemaFile}`);
  assert.equal(
    response.ok,
    true,
    `Could not load ${schemaFile} from ${SCHEMA_BASE_URL}.`,
  );
  return response.json();
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function joinPath(base, segment) {
  if (!base) {
    return segment;
  }

  if (segment.startsWith("[")) {
    return `${base}${segment}`;
  }

  return `${base}.${segment}`;
}

function resolveRef(rootSchema, ref) {
  if (!ref.startsWith("#/")) {
    throw new Error(`Unsupported $ref: ${ref}`);
  }

  const segments = ref
    .slice(2)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current = rootSchema;
  for (const segment of segments) {
    current = current?.[segment];
  }

  if (!current) {
    throw new Error(`Unresolvable $ref: ${ref}`);
  }

  return current;
}

function validateSchema(value, schema, rootSchema, atPath = "$") {
  if (schema.$ref) {
    return validateSchema(value, resolveRef(rootSchema, schema.$ref), rootSchema, atPath);
  }

  if (schema.anyOf) {
    const branchErrors = schema.anyOf.map((branch) =>
      validateSchema(value, branch, rootSchema, atPath),
    );
    if (branchErrors.some((errors) => errors.length === 0)) {
      return [];
    }
    return [
      `${atPath} must satisfy at least one allowed shape`,
      ...branchErrors.flat(),
    ];
  }

  const errors = [];

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${atPath} must equal ${JSON.stringify(schema.const)}`);
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(
      `${atPath} must be one of ${schema.enum.map((entry) => JSON.stringify(entry)).join(", ")}`,
    );
  }

  if (schema.type !== undefined) {
    const allowedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    const matchesType = allowedTypes.some((type) => {
      if (type === "null") {
        return value === null;
      }
      if (type === "array") {
        return Array.isArray(value);
      }
      if (type === "object") {
        return isPlainObject(value);
      }
      return typeof value === type;
    });

    if (!matchesType) {
      errors.push(`${atPath} must be of type ${allowedTypes.join(" | ")}`);
      return errors;
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${atPath} must have length >= ${schema.minLength}`);
    }

    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push(`${atPath} must match pattern ${schema.pattern}`);
      }
    }

    if (schema.format === "date-time") {
      if (!isoDateTimePattern.test(value) || Number.isNaN(Date.parse(value))) {
        errors.push(`${atPath} must be an ISO 8601 UTC timestamp`);
      }
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${atPath} must be >= ${schema.minimum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${atPath} must contain at least ${schema.minItems} item(s)`);
    }

    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(
          ...validateSchema(item, schema.items, rootSchema, joinPath(atPath, `[${index}]`)),
        );
      });
    }
  }

  if (isPlainObject(value)) {
    const propertyKeys = Object.keys(value);
    const definedProperties = schema.properties ?? {};
    const requiredProperties = schema.required ?? [];

    for (const key of requiredProperties) {
      if (!(key in value)) {
        errors.push(`${joinPath(atPath, key)} is required`);
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of propertyKeys) {
        if (!(key in definedProperties)) {
          errors.push(`${joinPath(atPath, key)} is not allowed`);
        }
      }
    }

    for (const [key, propertySchema] of Object.entries(definedProperties)) {
      if (key in value) {
        errors.push(
          ...validateSchema(value[key], propertySchema, rootSchema, joinPath(atPath, key)),
        );
      }
    }
  }

  return errors;
}

test("fitness ATLAS platform exports validate against the pinned root schemas", async () => {
  const failures = [];

  for (const plan of contractPlan) {
    const schema = await loadSchema(plan.schemaFile);
    const payload = loadJson(path.join(repoRoot, "exports", plan.exportFile));
    const errors = validateSchema(payload, schema, schema);

    if (errors.length > 0) {
      failures.push(
        `${plan.exportFile} should satisfy ${plan.schemaFile}\n${errors
          .map((error) => `  - ${error}`)
          .join("\n")}`,
      );
    }
  }

  assert.deepEqual(failures, []);
});

test("fitness ATLAS contract lane stays wired to docs, scripts, and workflow", () => {
  const packageJson = loadJson(packageJsonPath);
  const commandsDoc = fs.readFileSync(commandsDocPath, "utf8");
  const adoptionDoc = fs.readFileSync(adoptionDocPath, "utf8");
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.equal(packageJson.scripts["test:atlas-contracts"] !== undefined, true);
  assert.ok(commandsDoc.includes("npm run test:atlas-contracts"));
  assert.ok(adoptionDoc.includes("npm run test:atlas-contracts"));
  assert.ok(workflow.includes(`uses: fawxzzy/ATLAS/.github/workflows/reusable-atlas-app.yml@${ATLAS_CONTRACTS_REF}`));
  assert.ok(workflow.includes("contract_check_command: npm run test:atlas-contracts"));
  assert.ok(workflow.includes("verify_command: npm run verify"));
});
