const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY_ENV = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const DISCORD_VERIFICATION_BOT_SECRET_ENV = "DISCORD_VERIFICATION_BOT_SECRET";
const DISCORD_VERIFICATION_TOKEN_PEPPER_ENV = "DISCORD_VERIFICATION_TOKEN_PEPPER";
const DISCORD_VERIFICATION_TOKEN_TTL_MINUTES_ENV = "DISCORD_VERIFICATION_TOKEN_TTL_MINUTES";
const LEGACY_SUPABASE_URL_ENV = "LEGACY_SUPABASE_URL";
const LEGACY_SUPABASE_ANON_KEY_ENV = "LEGACY_SUPABASE_ANON_KEY";

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
