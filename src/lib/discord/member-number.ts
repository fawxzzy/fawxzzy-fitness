const DISCORD_NICKNAME_MAX_LENGTH = 32;
const EXISTING_MEMBER_NUMBER_PREFIX_PATTERN = /^#\d+\s+·\s+/;
const DEFAULT_MEMBER_DISPLAY_NAME = "Member";

export function shouldDisplayDiscordMemberNumber(args: {
  userKind: "human" | "automation" | "unknown" | null | undefined;
  userNumber: number | null | undefined;
}): boolean {
  return args.userKind === "human"
    && Number.isInteger(args.userNumber)
    && Number(args.userNumber) >= 0;
}

function sanitizeDiscordDisplayName(value: string | null | undefined): string {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  const withoutExistingPrefix = normalized.replace(EXISTING_MEMBER_NUMBER_PREFIX_PATTERN, "").trim();
  return withoutExistingPrefix || DEFAULT_MEMBER_DISPLAY_NAME;
}

export function formatDiscordMemberNickname(args: {
  userNumber: number;
  currentDisplayName: string | null | undefined;
}): string {
  const prefix = `#${args.userNumber} · `;
  const safeDisplayName = sanitizeDiscordDisplayName(args.currentDisplayName);
  const availableNameLength = DISCORD_NICKNAME_MAX_LENGTH - prefix.length;

  if (availableNameLength <= 0) {
    return prefix.slice(0, DISCORD_NICKNAME_MAX_LENGTH).trimEnd();
  }

  return `${prefix}${safeDisplayName.slice(0, availableNameLength)}`;
}
