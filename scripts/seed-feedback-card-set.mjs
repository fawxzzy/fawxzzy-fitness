#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseSeedArgs, runSeedFeedbackCardSet } from "./feedback-card-seed-core.mjs";
import { listFeedbackCardSets, resolveFeedbackCardSet } from "./feedback-card-sets.mjs";

export function parseCardSetArgs(argv = process.argv.slice(2)) {
  const passthrough = [];
  let setName = null;
  let listSets = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--set") {
      setName = String(argv[index + 1] ?? "").trim();
      index += 1;
      continue;
    }

    if (token === "--list-sets") {
      listSets = true;
      continue;
    }

    passthrough.push(token);
  }

  return {
    setName,
    listSets,
    seedArgs: parseSeedArgs(passthrough),
  };
}

export async function runSeedFeedbackCardSetSelection(options = {}) {
  const {
    argv = process.argv.slice(2),
    logger = console,
    ...rest
  } = options;
  const parsed = parseCardSetArgs(argv);

  if (parsed.listSets) {
    for (const cardSet of listFeedbackCardSets()) {
      logger.log(`${cardSet.key}: ${cardSet.name} (${cardSet.cardCount} cards)`);
    }
    return {
      listed: true,
      sets: listFeedbackCardSets(),
    };
  }

  const resolvedSet = resolveFeedbackCardSet(parsed.setName);
  if (!resolvedSet) {
    const availableSets = listFeedbackCardSets().map((cardSet) => cardSet.key).join(", ");
    throw new Error(`Unknown or missing feedback card set. Use --set <name>. Available sets: ${availableSets}`);
  }

  return runSeedFeedbackCardSet({
    ...rest,
    spec: resolvedSet.spec,
    commandName: `feedback:cards:seed:${resolvedSet.key}`,
    args: parsed.seedArgs,
    logger,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runSeedFeedbackCardSetSelection().catch((error) => {
    console.error(`seed-feedback-card-set failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
