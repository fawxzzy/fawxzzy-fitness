import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

function findAtlasRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);

  for (;;) {
    if (fs.existsSync(path.join(current, "stack.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }

    current = parent;
  }
}

function parseReceiptRoot(argv) {
  const flagIndex = argv.findIndex((value) => value === "--receipt-root");
  if (flagIndex === -1) {
    return path.join(findAtlasRoot(), "runtime", "receipts", "events");
  }

  const nextValue = argv[flagIndex + 1];
  if (!nextValue) {
    throw new Error("Expected a path after --receipt-root");
  }

  return path.resolve(nextValue);
}

const receiptRoot = parseReceiptRoot(process.argv.slice(2));
const moduleUrl = pathToFileURL(path.join(process.cwd(), "src", "lib", "ecosystem", "fitness-growth-pilot-readiness.ts")).href;
const { buildFitnessGrowthPilotReadinessReport } = await import(moduleUrl);

const report = buildFitnessGrowthPilotReadinessReport({
  receiptRoot,
});

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (report.decision !== "allow_narrow_sticky_pilot") {
  process.exitCode = 1;
}
