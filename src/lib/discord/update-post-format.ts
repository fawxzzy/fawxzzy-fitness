import { DISCORD_EMBED_COLOR_SUCCESS } from "@/lib/discord/interactions";

type DiscordFormattedUpdateField = {
  name: string;
  value: string;
};

type DiscordFormattedUpdateCommand = {
  title: string;
  description: string;
};

const DISCORD_UPDATE_TOP_LEVEL_SECTION_NAMES = new Set([
  "what changed",
  "the post now includes",
  "current markers",
  "why it matters",
  "report id",
  "current state",
  "status",
]);

export function buildDiscordComputaFormattedUpdatePayload(
  command: DiscordFormattedUpdateCommand,
): Record<string, unknown> {
  const { description, fields } = buildDiscordComputaUpdateEmbedParts(command.description);

  return {
    content: "",
    allowed_mentions: {
      parse: [],
    },
    embeds: [
      {
        title: command.title,
        description,
        color: DISCORD_EMBED_COLOR_SUCCESS,
        ...(fields.length > 0 ? { fields } : {}),
      },
    ],
  };
}

function buildDiscordComputaUpdateEmbedParts(rawDescription: string): {
  description: string;
  fields: DiscordFormattedUpdateField[];
} {
  const lines = rawDescription.split(/\r?\n/).map((line) => line.trim());
  const intro: string[] = [];
  const fields: DiscordFormattedUpdateField[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line) {
      index += 1;
      continue;
    }
    if (looksLikeDiscordUpdateSectionHeader(line)) {
      break;
    }
    intro.push(line);
    index += 1;
  }

  while (index < lines.length) {
    while (index < lines.length && !lines[index]) {
      index += 1;
    }
    if (index >= lines.length) {
      break;
    }

    const headerLine = lines[index];
    if (!looksLikeDiscordUpdateSectionHeader(headerLine)) {
      intro.push(headerLine);
      index += 1;
      continue;
    }

    const headerMatch = headerLine.match(/^([^:\n]{1,80}):\s*(.*)$/);
    if (!headerMatch) {
      intro.push(headerLine);
      index += 1;
      continue;
    }

    const name = headerMatch[1].trim();
    const inlineValue = headerMatch[2].trim();
    index += 1;

    const collectedLines: string[] = [];
    if (inlineValue) {
      collectedLines.push(inlineValue);
    }

    while (index < lines.length) {
      const nextLine = lines[index];
      if (!nextLine) {
        index += 1;
        if (collectedLines.length > 0) {
          break;
        }
        continue;
      }
      if (looksLikeDiscordUpdateSectionHeader(nextLine)) {
        break;
      }
      collectedLines.push(nextLine);
      index += 1;
    }

    if (collectedLines.length === 0) {
      continue;
    }

    fields.push({
      name: truncateDiscordUpdateFieldName(name),
      value: truncateDiscordUpdateFieldValue(formatDiscordUpdateFieldValue(name, collectedLines)),
    });
  }

  const description = intro.length > 0
    ? intro.join("\n")
    : fields.length > 0
      ? "A new update is live."
      : rawDescription;

  return {
    description: description.slice(0, 4096),
    fields: fields.slice(0, 10),
  };
}

function looksLikeDiscordUpdateSectionHeader(line: string): boolean {
  const headerMatch = line.match(/^([^:\n]{1,80}):\s*(.*)$/);
  if (!headerMatch) {
    return false;
  }

  const normalizedName = headerMatch[1].trim().toLowerCase();
  const inlineValue = headerMatch[2].trim();
  if (DISCORD_UPDATE_TOP_LEVEL_SECTION_NAMES.has(normalizedName)) {
    return true;
  }

  return inlineValue.length === 0 && normalizedName.length <= 40;
}

function truncateDiscordUpdateFieldName(value: string): string {
  return value.trim().slice(0, 256) || "Details";
}

function truncateDiscordUpdateFieldValue(value: string): string {
  return value.trim().slice(0, 1024) || "-";
}

function formatDiscordUpdateFieldValue(name: string, lines: string[]): string {
  const normalizedLines = lines
    .map((line) => line.trim())
    .filter(Boolean);

  if (normalizedLines.length === 0) {
    return "-";
  }

  const normalizedName = name.trim().toLowerCase();
  if (normalizedName === "report id") {
    return normalizedLines[0];
  }

  const hasExplicitBullets = normalizedLines.every((line) => /^[\-\*\u2022]/.test(line));
  if (normalizedLines.length > 1 && !hasExplicitBullets) {
    return normalizedLines.map((line) => `- ${line}`).join("\n");
  }

  return normalizedLines.join("\n");
}
