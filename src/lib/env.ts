const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY_ENV = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const DISCORD_VERIFICATION_BOT_SECRET_ENV = "DISCORD_VERIFICATION_BOT_SECRET";
const DISCORD_VERIFICATION_TOKEN_PEPPER_ENV = "DISCORD_VERIFICATION_TOKEN_PEPPER";
const DISCORD_VERIFICATION_TOKEN_TTL_MINUTES_ENV = "DISCORD_VERIFICATION_TOKEN_TTL_MINUTES";
const DISCORD_PUBLIC_KEY_ENV = "DISCORD_PUBLIC_KEY";
const DISCORD_BOT_TOKEN_ENV = "DISCORD_BOT_TOKEN";
const DISCORD_APPLICATION_ID_ENV = "DISCORD_APPLICATION_ID";
const DISCORD_GUILD_ID_ENV = "DISCORD_GUILD_ID";
const DISCORD_VERIFY_CHANNEL_ID_ENV = "DISCORD_VERIFY_CHANNEL_ID";
const DISCORD_VERIFIED_ROLE_ID_ENV = "DISCORD_VERIFIED_ROLE_ID";
const DISCORD_UNVERIFIED_ROLE_ID_ENV = "DISCORD_UNVERIFIED_ROLE_ID";
const DISCORD_VERIFY_MESSAGE_TITLE_ENV = "DISCORD_VERIFY_MESSAGE_TITLE";
const DISCORD_VERIFY_MESSAGE_BODY_ENV = "DISCORD_VERIFY_MESSAGE_BODY";
const LEGACY_SUPABASE_URL_ENV = "LEGACY_SUPABASE_URL";
const LEGACY_SUPABASE_ANON_KEY_ENV = "LEGACY_SUPABASE_ANON_KEY";
const DISCORD_SNOWFLAKE_PATTERN = /^\d{5,32}$/;
const HEX_PATTERN = /^[0-9a-f]+$/i;

export function mustGetEnv(name: string): string {
  const rawValue =
    name === SUPABASE_URL_ENV
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : name === SUPABASE_ANON_KEY_ENV
        ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        : process.env[name];
  const value = rawValue?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env.local for local development and in Vercel Environment Variables for deployments.`
    );
  }

  return value;
}

export function SUPABASE_URL(): string {
  return mustGetEnv(SUPABASE_URL_ENV);
}

export function SUPABASE_ANON_KEY(): string {
  return mustGetEnv(SUPABASE_ANON_KEY_ENV);
}

export function LEGACY_SUPABASE_URL(): string {
  return mustGetEnv(LEGACY_SUPABASE_URL_ENV);
}

export function LEGACY_SUPABASE_ANON_KEY(): string {
  return mustGetEnv(LEGACY_SUPABASE_ANON_KEY_ENV);
}

export function optionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function mustGetSnowflakeEnv(name: string): string {
  const value = mustGetEnv(name);

  if (!DISCORD_SNOWFLAKE_PATTERN.test(value)) {
    throw new Error(`Invalid environment variable: ${name}. Expected a Discord snowflake numeric string.`);
  }

  return value;
}

function mustGetHexEnv(name: string, expectedLength?: number): string {
  const value = mustGetEnv(name);

  if (!HEX_PATTERN.test(value) || (expectedLength !== undefined && value.length !== expectedLength)) {
    const expectedLengthSuffix = expectedLength !== undefined ? ` with length ${expectedLength}` : "";
    throw new Error(`Invalid environment variable: ${name}. Expected a hexadecimal string${expectedLengthSuffix}.`);
  }

  return value.toLowerCase();
}

export function SUPABASE_SERVICE_ROLE_KEY(): string {
  return mustGetEnv(SUPABASE_SERVICE_ROLE_KEY_ENV);
}

export function DISCORD_VERIFICATION_BOT_SECRET(): string {
  return mustGetEnv(DISCORD_VERIFICATION_BOT_SECRET_ENV);
}

export function DISCORD_VERIFICATION_TOKEN_PEPPER(): string {
  return mustGetEnv(DISCORD_VERIFICATION_TOKEN_PEPPER_ENV);
}

export function DISCORD_VERIFICATION_TOKEN_TTL_MINUTES(): number | null {
  const rawValue = optionalEnv(DISCORD_VERIFICATION_TOKEN_TTL_MINUTES_ENV);

  if (!rawValue) {
    return null;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(
      `Invalid environment variable: ${DISCORD_VERIFICATION_TOKEN_TTL_MINUTES_ENV}. Expected a positive integer number of minutes.`
    );
  }

  return parsedValue;
}

export function DISCORD_PUBLIC_KEY(): string {
  return mustGetHexEnv(DISCORD_PUBLIC_KEY_ENV, 64);
}

export function DISCORD_BOT_TOKEN(): string {
  return mustGetEnv(DISCORD_BOT_TOKEN_ENV);
}

export function DISCORD_APPLICATION_ID(): string {
  return mustGetSnowflakeEnv(DISCORD_APPLICATION_ID_ENV);
}

export function DISCORD_GUILD_ID(): string {
  return mustGetSnowflakeEnv(DISCORD_GUILD_ID_ENV);
}

export function DISCORD_VERIFY_CHANNEL_ID(): string {
  return mustGetSnowflakeEnv(DISCORD_VERIFY_CHANNEL_ID_ENV);
}

export function DISCORD_VERIFIED_ROLE_ID(): string {
  return mustGetSnowflakeEnv(DISCORD_VERIFIED_ROLE_ID_ENV);
}

export function DISCORD_UNVERIFIED_ROLE_ID(): string | null {
  const value = optionalEnv(DISCORD_UNVERIFIED_ROLE_ID_ENV);
  if (!value) {
    return null;
  }

  if (!DISCORD_SNOWFLAKE_PATTERN.test(value)) {
    throw new Error(`Invalid environment variable: ${DISCORD_UNVERIFIED_ROLE_ID_ENV}. Expected a Discord snowflake numeric string.`);
  }

  return value;
}

export function DISCORD_VERIFY_MESSAGE_TITLE(): string | null {
  return optionalEnv(DISCORD_VERIFY_MESSAGE_TITLE_ENV);
}

export function DISCORD_VERIFY_MESSAGE_BODY(): string | null {
  return optionalEnv(DISCORD_VERIFY_MESSAGE_BODY_ENV);
}
