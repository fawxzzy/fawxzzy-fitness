const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY_ENV = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";

export function mustGetEnv(name: string): string {
  const value =
    name === SUPABASE_URL_ENV
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : name === SUPABASE_ANON_KEY_ENV
        ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        : process.env[name];

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

export function optionalEnv(name: string): string | null {
  return process.env[name] ?? null;
}

export function SUPABASE_SERVICE_ROLE_KEY(): string {
  return mustGetEnv(SUPABASE_SERVICE_ROLE_KEY_ENV);
}
