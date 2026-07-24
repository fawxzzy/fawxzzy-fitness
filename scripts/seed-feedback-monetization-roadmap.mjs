#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  buildRoadmapInsertValues as buildGenericRoadmapInsertValues,
  buildRoadmapStepsToReproduce,
  parseSeedArgs,
  runSeedFeedbackCardSet,
} from "./feedback-card-seed-core.mjs";
import { FEEDBACK_MONETIZATION_CARD_SET } from "./feedback-monetization-roadmap.mjs";

export const parseArgs = parseSeedArgs;

export { buildRoadmapStepsToReproduce };

export function buildRoadmapInsertValues(card, options = {}) {
  return buildGenericRoadmapInsertValues(card, {
    defaultBoardStatus: FEEDBACK_MONETIZATION_CARD_SET.defaultBoardStatus,
    ...options,
  });
}

export async function runSeedFeedbackMonetizationRoadmap(options = {}) {
  const {
    args = parseArgs(),
    ...rest
  } = options;

  return runSeedFeedbackCardSet({
    ...rest,
    spec: FEEDBACK_MONETIZATION_CARD_SET,
    commandName: "feedback:monetization:seed",
    args,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runSeedFeedbackMonetizationRoadmap().catch((error) => {
    console.error(`seed-feedback-monetization-roadmap failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
