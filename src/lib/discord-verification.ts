import { createHash, randomBytes } from "node:crypto";
import { DISCORD_VERIFICATION_TOKEN_PEPPER, DISCORD_VERIFICATION_TOKEN_TTL_MINUTES } from "./env.ts";

const TOKEN_PREFIX = "FWX";
const TOKEN_BODY_LENGTH = 8;
const TOKEN_GROUP_SIZE = 4;
const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_TOKEN_TTL_MINUTES = 15;
const DISCORD_USER_ID_PATTERN = /^\d{5,32}$/;
const NORMALIZED_TOKEN_PATTERN = new RegExp(`^${TOKEN_PREFIX}[A-Z0-9]{${TOKEN_BODY_LENGTH}}$`);

export const MAX_DISCORD_USERNAME_LENGTH = 64;

export function normalizeDiscordVerificationToken(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidDiscordVerificationToken(value: string): boolean {
  return NORMALIZED_TOKEN_PATTERN.test(normalizeDiscordVerificationToken(value));
}

export function hashDiscordVerificationToken(
  value: string,
  pepper: string = DISCORD_VERIFICATION_TOKEN_PEPPER(),
): string {
  const normalizedToken = normalizeDiscordVerificationToken(value);
  return createHash("sha256").update(`${pepper}:${normalizedToken}`).digest("hex");
}

export function resolveDiscordVerificationTokenTtlMinutes(ttlMinutes: number | null = DISCORD_VERIFICATION_TOKEN_TTL_MINUTES()): number {
  if (typeof ttlMinutes === "number" && Number.isInteger(ttlMinutes) && ttlMinutes > 0) {
    return ttlMinutes;
  }

  return DEFAULT_TOKEN_TTL_MINUTES;
}

export function calculateDiscordVerificationExpiry(options?: {
  now?: Date;
  ttlMinutes?: number | null;
}): Date {
  const now = options?.now ?? new Date();
  const ttlMinutes = resolveDiscordVerificationTokenTtlMinutes(options?.ttlMinutes ?? null);
  return new Date(now.getTime() + ttlMinutes * 60 * 1000);
}

export function generateDiscordVerificationToken(
  randomBytesImpl: (size: number) => Uint8Array = randomBytes,
): string {
  const bytes = randomBytesImpl(TOKEN_BODY_LENGTH);
  const body = Array.from(bytes, (byte) => TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length]).join("");
  const chunks = body.match(new RegExp(`.{1,${TOKEN_GROUP_SIZE}}`, "g")) ?? [body];
  return `${TOKEN_PREFIX}-${chunks.join("-")}`;
}

export function normalizeDiscordUserId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return DISCORD_USER_ID_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeDiscordUsername(value: string): string {
  return value.trim();
}

export function isValidDiscordUsername(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = normalizeDiscordUsername(value);
  return normalized.length > 0 && normalized.length <= MAX_DISCORD_USERNAME_LENGTH;
}
