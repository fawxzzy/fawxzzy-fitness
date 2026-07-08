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
const DISCORD_PURGATORY_ROLE_ID_ENV = "DISCORD_PURGATORY_ROLE_ID";
const DISCORD_PURGATORY_CATEGORY_ID_ENV = "DISCORD_PURGATORY_CATEGORY_ID";
const DISCORD_PURGATORY_CHANNEL_ID_ENV = "DISCORD_PURGATORY_CHANNEL_ID";
const DISCORD_MOD_LOG_CHANNEL_ID_ENV = "DISCORD_MOD_LOG_CHANNEL_ID";
const DISCORD_PURGATORY_REMOVED_ROLE_IDS_ENV = "DISCORD_PURGATORY_REMOVED_ROLE_IDS";
const DISCORD_VERIFY_MESSAGE_TITLE_ENV = "DISCORD_VERIFY_MESSAGE_TITLE";
const DISCORD_VERIFY_MESSAGE_BODY_ENV = "DISCORD_VERIFY_MESSAGE_BODY";
const DISCORD_MEMBER_SYNC_SECRET_ENV = "DISCORD_MEMBER_SYNC_SECRET";
const DISCORD_BUG_REPORT_CHANNEL_ID_ENV = "DISCORD_BUG_REPORT_CHANNEL_ID";
const DISCORD_FEEDBACK_PANEL_CHANNEL_ID_ENV = "DISCORD_FEEDBACK_PANEL_CHANNEL_ID";
const DISCORD_BUG_REPORT_FORUM_CHANNEL_ID_ENV = "DISCORD_BUG_REPORT_FORUM_CHANNEL_ID";
const DISCORD_SPOTIFY_CLUB_CHANNEL_ID_ENV = "DISCORD_SPOTIFY_CLUB_CHANNEL_ID";
const DISCORD_SPOTIFY_CLUB_TEST_CHANNEL_ID_ENV = "DISCORD_SPOTIFY_CLUB_TEST_CHANNEL_ID";
const DISCORD_FEEDBACK_BUG_EMOJI_ID_ENV = "DISCORD_FEEDBACK_BUG_EMOJI_ID";
const DISCORD_FEEDBACK_FEATURE_EMOJI_ID_ENV = "DISCORD_FEEDBACK_FEATURE_EMOJI_ID";
const DISCORD_MAIN_CHANNEL_ID_ENV = "DISCORD_MAIN_CHANNEL_ID";
const DISCORD_UPDATES_CHANNEL_ID_ENV = "DISCORD_UPDATES_CHANNEL_ID";
const DISCORD_UPDATE_BOT_ENABLED_ENV = "DISCORD_UPDATE_BOT_ENABLED";
const DISCORD_UPDATE_AUTO_PUBLISH_ENABLED_ENV = "DISCORD_UPDATE_AUTO_PUBLISH_ENABLED";
const VERCEL_DEPLOYMENT_WEBHOOK_SECRET_ENV = "VERCEL_DEPLOYMENT_WEBHOOK_SECRET";
const VERCEL_WEBHOOK_SECRET_ENV = "VERCEL_WEBHOOK_SECRET";
const VERCEL_PROJECT_ID_ENV = "VERCEL_PROJECT_ID";
const SPOTIFY_CLIENT_ID_ENV = "SPOTIFY_CLIENT_ID";
const SPOTIFY_CLIENT_SECRET_ENV = "SPOTIFY_CLIENT_SECRET";
const SPOTIFY_REDIRECT_URI_ENV = "SPOTIFY_REDIRECT_URI";
const SPOTIFY_TOKEN_ENCRYPTION_KEY_ENV = "SPOTIFY_TOKEN_ENCRYPTION_KEY";
const SPOTIFY_OAUTH_STATE_SECRET_ENV = "SPOTIFY_OAUTH_STATE_SECRET";
const LEGACY_SUPABASE_URL_ENV = "LEGACY_SUPABASE_URL";
const LEGACY_SUPABASE_ANON_KEY_ENV = "LEGACY_SUPABASE_ANON_KEY";
const STRIPE_SECRET_KEY_ENV = "STRIPE_SECRET_KEY";
const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_ENV = "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY";
const STRIPE_WEBHOOK_SECRET_ENV = "STRIPE_WEBHOOK_SECRET";
const STRIPE_PRO_FOUNDING_PRICE_ID_ENV = "STRIPE_PRO_FOUNDING_PRICE_ID";
const STRIPE_PRO_STANDARD_PRICE_ID_ENV = "STRIPE_PRO_STANDARD_PRICE_ID";
const STRIPE_PRO_ACTIVE_PRICE_MODE_ENV = "STRIPE_PRO_ACTIVE_PRICE_MODE";
const STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID_ENV = "STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID";
const STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID_ENV = "STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID";
const STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE_ENV = "STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE";
const DISCORD_SNOWFLAKE_PATTERN = /^\d{5,32}$/;
const HEX_PATTERN = /^[0-9a-f]+$/i;

export function mustGetEnv(name: string): string {
  const rawValue =
    name === SUPABASE_URL_ENV
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : name === SUPABASE_ANON_KEY_ENV
        ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        : process.env[name];
  const value = normalizeEnvValue(rawValue);

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
  const value = normalizeEnvValue(process.env[name]);
  return value && value.length > 0 ? value : null;
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  return value?.replace(/(?:\\r|\\n)+$/g, "").trim();
}

function optionalBooleanEnv(name: string, fallback = false): boolean {
  const value = optionalEnv(name);
  if (!value) {
    return fallback;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`Invalid environment variable: ${name}. Expected 'true' or 'false'.`);
}

function mustGetSnowflakeEnv(name: string): string {
  const value = mustGetEnv(name);

  if (!DISCORD_SNOWFLAKE_PATTERN.test(value)) {
    throw new Error(`Invalid environment variable: ${name}. Expected a Discord snowflake numeric string.`);
  }

  return value;
}

function optionalSnowflakeEnv(name: string): string | null {
  const value = optionalEnv(name);
  if (!value) {
    return null;
  }

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

export function DISCORD_VERIFY_CHANNEL_ID_OPTIONAL(): string | null {
  return optionalSnowflakeEnv(DISCORD_VERIFY_CHANNEL_ID_ENV);
}

export function DISCORD_VERIFIED_ROLE_ID(): string {
  return mustGetSnowflakeEnv(DISCORD_VERIFIED_ROLE_ID_ENV);
}

export function DISCORD_VERIFIED_ROLE_ID_OPTIONAL(): string | null {
  return optionalSnowflakeEnv(DISCORD_VERIFIED_ROLE_ID_ENV);
}

export function DISCORD_UNVERIFIED_ROLE_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_UNVERIFIED_ROLE_ID_ENV);
}

export function DISCORD_VERIFY_MESSAGE_TITLE(): string | null {
  return optionalEnv(DISCORD_VERIFY_MESSAGE_TITLE_ENV);
}

export function DISCORD_VERIFY_MESSAGE_BODY(): string | null {
  return optionalEnv(DISCORD_VERIFY_MESSAGE_BODY_ENV);
}

export function DISCORD_MEMBER_SYNC_SECRET(): string {
  return mustGetEnv(DISCORD_MEMBER_SYNC_SECRET_ENV);
}

export function DISCORD_BUG_REPORT_CHANNEL_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_BUG_REPORT_CHANNEL_ID_ENV);
}

export function DISCORD_FEEDBACK_PANEL_CHANNEL_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_FEEDBACK_PANEL_CHANNEL_ID_ENV);
}

export function DISCORD_BUG_REPORT_FORUM_CHANNEL_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_BUG_REPORT_FORUM_CHANNEL_ID_ENV);
}

export function DISCORD_SPOTIFY_CLUB_CHANNEL_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_SPOTIFY_CLUB_CHANNEL_ID_ENV);
}

export function DISCORD_SPOTIFY_CLUB_TEST_CHANNEL_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_SPOTIFY_CLUB_TEST_CHANNEL_ID_ENV);
}

export function DISCORD_FEEDBACK_BUG_EMOJI_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_FEEDBACK_BUG_EMOJI_ID_ENV);
}

export function DISCORD_FEEDBACK_FEATURE_EMOJI_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_FEEDBACK_FEATURE_EMOJI_ID_ENV);
}

export function DISCORD_UPDATES_CHANNEL_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_UPDATES_CHANNEL_ID_ENV);
}

export function DISCORD_MAIN_CHANNEL_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_MAIN_CHANNEL_ID_ENV);
}

export function DISCORD_PURGATORY_ROLE_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_PURGATORY_ROLE_ID_ENV);
}

export function DISCORD_PURGATORY_CATEGORY_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_PURGATORY_CATEGORY_ID_ENV);
}

export function DISCORD_PURGATORY_CHANNEL_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_PURGATORY_CHANNEL_ID_ENV);
}

export function DISCORD_MOD_LOG_CHANNEL_ID(): string | null {
  return optionalSnowflakeEnv(DISCORD_MOD_LOG_CHANNEL_ID_ENV);
}

export function DISCORD_PURGATORY_REMOVED_ROLE_IDS(): string[] {
  const value = optionalEnv(DISCORD_PURGATORY_REMOVED_ROLE_IDS_ENV);
  if (!value) {
    return [];
  }

  return [...new Set(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        if (!DISCORD_SNOWFLAKE_PATTERN.test(entry)) {
          throw new Error(
            `Invalid environment variable: ${DISCORD_PURGATORY_REMOVED_ROLE_IDS_ENV}. Expected a comma-separated list of Discord snowflake numeric strings.`,
          );
        }

        return entry;
      }),
  )];
}

export function DISCORD_UPDATE_BOT_ENABLED(): boolean {
  return optionalBooleanEnv(DISCORD_UPDATE_BOT_ENABLED_ENV, false);
}

export function DISCORD_UPDATE_AUTO_PUBLISH_ENABLED(): boolean {
  return optionalBooleanEnv(DISCORD_UPDATE_AUTO_PUBLISH_ENABLED_ENV, false);
}

export function VERCEL_DEPLOYMENT_WEBHOOK_SECRET(): string {
  const preferred = optionalEnv(VERCEL_DEPLOYMENT_WEBHOOK_SECRET_ENV);
  if (preferred) {
    return preferred;
  }

  const legacy = optionalEnv(VERCEL_WEBHOOK_SECRET_ENV);
  if (legacy) {
    return legacy;
  }

  throw new Error(
    `Missing required environment variable: ${VERCEL_DEPLOYMENT_WEBHOOK_SECRET_ENV}. ` +
    `Set ${VERCEL_DEPLOYMENT_WEBHOOK_SECRET_ENV} or ${VERCEL_WEBHOOK_SECRET_ENV}.`
  );
}

export function VERCEL_PROJECT_ID(): string | null {
  return optionalEnv(VERCEL_PROJECT_ID_ENV);
}

export function SPOTIFY_CLIENT_ID(): string {
  return mustGetEnv(SPOTIFY_CLIENT_ID_ENV);
}

export function SPOTIFY_CLIENT_SECRET(): string {
  return mustGetEnv(SPOTIFY_CLIENT_SECRET_ENV);
}

export function SPOTIFY_REDIRECT_URI(): string {
  return mustGetEnv(SPOTIFY_REDIRECT_URI_ENV);
}

export function SPOTIFY_TOKEN_ENCRYPTION_KEY(): string {
  return mustGetEnv(SPOTIFY_TOKEN_ENCRYPTION_KEY_ENV);
}

export function SPOTIFY_OAUTH_STATE_SECRET(): string {
  return mustGetEnv(SPOTIFY_OAUTH_STATE_SECRET_ENV);
}

export function STRIPE_SECRET_KEY_OPTIONAL(): string | null {
  return optionalEnv(STRIPE_SECRET_KEY_ENV);
}

export function NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_OPTIONAL(): string | null {
  return optionalEnv(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_ENV);
}

export function STRIPE_WEBHOOK_SECRET_OPTIONAL(): string | null {
  return optionalEnv(STRIPE_WEBHOOK_SECRET_ENV);
}

export function STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID_OPTIONAL(): string | null {
  return optionalEnv(STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID_ENV);
}

export function STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID_OPTIONAL(): string | null {
  return optionalEnv(STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID_ENV);
}

export function STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE_OPTIONAL(): "founding" | "standard" | null {
  const value = optionalEnv(STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE_ENV);
  if (!value) {
    return null;
  }

  if (value === "founding" || value === "standard") {
    return value;
  }

  throw new Error(
    `Invalid environment variable: ${STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE_ENV}. Expected 'founding' or 'standard'.`,
  );
}

export function STRIPE_PRO_FOUNDING_PRICE_ID_OPTIONAL(): string | null {
  return optionalEnv(STRIPE_PRO_FOUNDING_PRICE_ID_ENV) ?? STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID_OPTIONAL();
}

export function STRIPE_PRO_STANDARD_PRICE_ID_OPTIONAL(): string | null {
  return optionalEnv(STRIPE_PRO_STANDARD_PRICE_ID_ENV) ?? STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID_OPTIONAL();
}

export function STRIPE_PRO_ACTIVE_PRICE_MODE_OPTIONAL(): "founding" | "standard" | null {
  const value = optionalEnv(STRIPE_PRO_ACTIVE_PRICE_MODE_ENV);
  if (!value) {
    return STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE_OPTIONAL();
  }

  if (value === "founding" || value === "standard") {
    return value;
  }

  throw new Error(
    `Invalid environment variable: ${STRIPE_PRO_ACTIVE_PRICE_MODE_ENV}. Expected 'founding' or 'standard'.`,
  );
}
