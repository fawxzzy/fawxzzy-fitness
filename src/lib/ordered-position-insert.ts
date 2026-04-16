import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

type ServerSupabase = ReturnType<typeof supabaseServer>;
type OrderedTableName = "session_exercises" | "routine_day_exercises";
type OrderedScopeColumn = "session_id" | "routine_day_id";

const MAX_ORDERED_APPEND_RETRIES = 5;

type InsertOrderedRowAtEndArgs = {
  supabase: ServerSupabase;
  table: OrderedTableName;
  scopeColumn: OrderedScopeColumn;
  scopeId: string;
  userId: string;
  values: Record<string, unknown>;
  select?: string;
};

function isUniqueViolation(error: PostgrestError | null) {
  return error?.code === "23505";
}

async function readNextPosition(args: {
  supabase: ServerSupabase;
  table: OrderedTableName;
  scopeColumn: OrderedScopeColumn;
  scopeId: string;
  userId: string;
}) {
  const { data, error } = await args.supabase
    .from(args.table)
    .select("position")
    .eq(args.scopeColumn, args.scopeId)
    .eq("user_id", args.userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { nextPosition: null, error };
  }

  return {
    nextPosition: typeof data?.position === "number" ? data.position + 1 : 0,
    error: null,
  };
}

async function insertOrderedRowAtEnd<TData = null>(args: InsertOrderedRowAtEndArgs): Promise<{
  data: TData | null;
  error: PostgrestError | null;
}> {
  let lastError: PostgrestError | null = null;

  for (let attempt = 0; attempt < MAX_ORDERED_APPEND_RETRIES; attempt += 1) {
    const { nextPosition, error: readError } = await readNextPosition(args);
    if (readError || nextPosition === null) {
      return { data: null, error: readError };
    }

    const insertPayload = {
      ...args.values,
      position: nextPosition,
    };

    if (args.select) {
      const { data, error } = await args.supabase
        .from(args.table)
        .insert(insertPayload)
        .select(args.select)
        .single();

      if (!error) {
        return { data: data as TData, error: null };
      }

      if (!isUniqueViolation(error)) {
        return { data: null, error };
      }

      lastError = error;
      continue;
    }

    const { error } = await args.supabase.from(args.table).insert(insertPayload);
    if (!error) {
      return { data: null, error: null };
    }

    if (!isUniqueViolation(error)) {
      return { data: null, error };
    }

    lastError = error;
  }

  return { data: null, error: lastError };
}

export function insertSessionExerciseAtEnd<TData = null>(args: {
  supabase: ServerSupabase;
  sessionId: string;
  userId: string;
  values: Record<string, unknown>;
  select?: string;
}) {
  return insertOrderedRowAtEnd<TData>({
    supabase: args.supabase,
    table: "session_exercises",
    scopeColumn: "session_id",
    scopeId: args.sessionId,
    userId: args.userId,
    values: args.values,
    select: args.select,
  });
}

export function insertRoutineDayExerciseAtEnd<TData = null>(args: {
  supabase: ServerSupabase;
  routineDayId: string;
  userId: string;
  values: Record<string, unknown>;
  select?: string;
}) {
  return insertOrderedRowAtEnd<TData>({
    supabase: args.supabase,
    table: "routine_day_exercises",
    scopeColumn: "routine_day_id",
    scopeId: args.routineDayId,
    userId: args.userId,
    values: args.values,
    select: args.select,
  });
}
