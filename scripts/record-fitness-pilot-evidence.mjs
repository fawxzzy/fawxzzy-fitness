import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const allowedTypes = new Set([
  "pilot_shadow_impression_logged",
  "pilot_shadow_click_logged",
  "pilot_placement_dismissed",
  "pilot_support_complaint_opened",
  "pilot_activation_retained",
]);

function readFlag(argv, flag, fallback = null) {
  const index = argv.findIndex((value) => value === flag);
  if (index === -1) {
    return fallback;
  }

  return argv[index + 1] ?? fallback;
}

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

const argv = process.argv.slice(2);
const signalType = readFlag(argv, "--signal-type");
const memberId = readFlag(argv, "--member-id");
const sourceOutboundId = readFlag(argv, "--source-outbound-id");

if (!signalType || !allowedTypes.has(signalType)) {
  throw new Error(`--signal-type must be one of: ${[...allowedTypes].join(", ")}`);
}

if (!memberId) {
  throw new Error("--member-id is required");
}

if (!sourceOutboundId) {
  throw new Error("--source-outbound-id is required");
}

const moduleUrl = pathToFileURL(path.join(process.cwd(), "src", "lib", "ecosystem", "fitness-pilot-evidence.ts")).href;
const { recordFitnessPilotEvidenceSignal } = await import(moduleUrl);

const atlasRoot = findAtlasRoot();
process.chdir(atlasRoot);

const result = await recordFitnessPilotEvidenceSignal({
  memberId,
  signalType,
  sourceOutboundId,
  occurredAt: readFlag(argv, "--occurred-at", new Date().toISOString()),
  placementId: readFlag(argv, "--placement-id", "recovery_reset_shadow_placement"),
  surfaceId: readFlag(argv, "--surface-id", "today_recovery_banner"),
  destinationPath: readFlag(argv, "--destination-path", "/today"),
  cohortId: readFlag(argv, "--cohort-id", "manual_shadow_cohort"),
  dismissalReasonCode: readFlag(argv, "--dismissal-reason-code", "member_dismissed"),
  complaintCode: readFlag(argv, "--complaint-code", "member_support_ticket"),
  retentionWindowDays: Number(readFlag(argv, "--retention-window-days", "7")),
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
