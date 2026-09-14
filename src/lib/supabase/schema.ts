import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const FITNESS_DATABASE_SCHEMA = "fitness" as const;

export type FitnessSupabaseClient = SupabaseClient<
  Database,
  typeof FITNESS_DATABASE_SCHEMA
>;

export function createFitnessSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string,
  options: Omit<SupabaseClientOptions<typeof FITNESS_DATABASE_SCHEMA>, "db"> = {},
): FitnessSupabaseClient {
  return createClient<Database, typeof FITNESS_DATABASE_SCHEMA>(
    supabaseUrl,
    supabaseKey,
    {
      ...options,
      db: {
        schema: FITNESS_DATABASE_SCHEMA,
      },
    },
  );
}
