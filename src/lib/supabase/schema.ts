import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";

export const FITNESS_DATABASE_SCHEMA = "fitness" as const;

type FitnessDatabase = {
  fitness: any;
};

export type FitnessSupabaseClient = SupabaseClient<any, any, any>;

export function createFitnessSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string,
  options: Omit<SupabaseClientOptions<typeof FITNESS_DATABASE_SCHEMA>, "db"> = {},
): FitnessSupabaseClient {
  const client = createClient<FitnessDatabase, typeof FITNESS_DATABASE_SCHEMA>(
    supabaseUrl,
    supabaseKey,
    {
      ...options,
      db: {
        schema: FITNESS_DATABASE_SCHEMA,
      },
    },
  );

  return client as FitnessSupabaseClient;
}
