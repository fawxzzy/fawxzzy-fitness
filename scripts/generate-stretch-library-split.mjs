import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(repoRoot, "src/lib/stretch-library.ts");
const summariesPath = path.join(repoRoot, "src/lib/stretch-library-summaries.ts");
const detailsPath = path.join(repoRoot, "src/lib/stretch-library-details.ts");

const source = fs.readFileSync(sourcePath, "utf8");
const match = source.match(/export const STRETCH_LIBRARY: StretchReferenceItem\[] = \[(?<body>[\s\S]*?)\n\];/);

if (!match?.groups?.body) {
  throw new Error("Unable to locate STRETCH_LIBRARY in stretch-library.ts");
}

const body = match.groups.body;
const objects = body.split(/\n  \},/).map((chunk, index, array) => chunk + (index === array.length - 1 ? "" : "\n  },"));

const summaryObjects = objects.map((chunk) => chunk.split("\n").filter((line) => {
  const trimmed = line.trimStart();
  return !trimmed.startsWith("coachingCue:") && !trimmed.startsWith("howTo:");
}).join("\n"));

const detailObjects = objects.map((chunk) => chunk.split("\n").filter((line) => {
  const trimmed = line.trimStart();
  return trimmed.startsWith("{")
    || trimmed.startsWith("id:")
    || trimmed.startsWith("coachingCue:")
    || trimmed.startsWith("howTo:")
    || trimmed.startsWith("},");
}).join("\n"));

const summaryFile = `import type { StretchReferenceSummary } from "@/lib/stretch-library-types";\n\nexport const STRETCH_LIBRARY_SUMMARIES: StretchReferenceSummary[] = [${summaryObjects.join("")}\n];\n`;
const detailFile = `import type { StretchReferenceDetail } from "@/lib/stretch-library-types";\n\nexport const STRETCH_LIBRARY_DETAILS: StretchReferenceDetail[] = [${detailObjects.join("")}\n];\n\nconst stretchReferenceDetailLookup = new Map(STRETCH_LIBRARY_DETAILS.map((detail) => [detail.id, detail] as const));\n\nexport function getStretchReferenceDetailById(id: string) {\n  return stretchReferenceDetailLookup.get(id) ?? null;\n}\n`;

fs.writeFileSync(summariesPath, summaryFile);
fs.writeFileSync(detailsPath, detailFile);

console.log(`Generated stretch library split files from ${path.relative(repoRoot, sourcePath)}`);
