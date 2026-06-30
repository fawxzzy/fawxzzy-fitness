type SupabaseLikeError = {
  message?: string | null;
  code?: string | null;
};

const PROGRESSION_PLAYBOOK_COLUMNS = [
  "progression_playbook_id",
  "progression_playbook_config",
] as const;

const ROUTINE_DEFAULT_PROGRESSION_COLUMNS = [
  "default_progression_playbook_id",
  "default_progression_playbook_config",
] as const;
const SESSION_COPILOT_FEEDBACK_EFFORT_COLUMNS = [
  "copilot_feedback_effort",
] as const;

const SCHEMA_CACHE_MISSING_COLUMN_PATTERN = /could not find the '([^']+)' column of '([^']+)' in the schema cache/i;
const POSTGRES_MISSING_COLUMN_PATTERN = /column\s+(?:(?:public\.)?([a-z_][a-z0-9_]*)\.)?([a-z_][a-z0-9_]*)\s+does not exist/i;

export type MissingSchemaColumnDiagnostic = {
  table: string | null;
  column: string;
  operation?: string | null;
  activeSupabaseHost: string | null;
};

function normalizeIdentifier(value: string | null | undefined) {
  return value?.trim().replace(/^"|"$/g, "").toLowerCase() || null;
}

export function getActiveSupabaseHost() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!rawUrl) {
    return null;
  }

  try {
    return new URL(rawUrl).host;
  } catch {
    return rawUrl;
  }
}

export function getMissingSchemaColumnDiagnostic(
  error: SupabaseLikeError | null | undefined,
  operation?: string,
): MissingSchemaColumnDiagnostic | null {
  const message = error?.message ?? "";
  const schemaCacheMatch = message.match(SCHEMA_CACHE_MISSING_COLUMN_PATTERN);
  if (schemaCacheMatch) {
    return {
      column: normalizeIdentifier(schemaCacheMatch[1]) ?? schemaCacheMatch[1],
      table: normalizeIdentifier(schemaCacheMatch[2]),
      operation: operation ?? null,
      activeSupabaseHost: getActiveSupabaseHost(),
    };
  }

  const postgresMatch = message.match(POSTGRES_MISSING_COLUMN_PATTERN);
  if (postgresMatch) {
    return {
      table: normalizeIdentifier(postgresMatch[1]),
      column: normalizeIdentifier(postgresMatch[2]) ?? postgresMatch[2],
      operation: operation ?? null,
      activeSupabaseHost: getActiveSupabaseHost(),
    };
  }

  return null;
}

function isMissingColumnOnTable(
  error: SupabaseLikeError | null | undefined,
  table: string,
  columns: readonly string[],
) {
  const diagnostic = getMissingSchemaColumnDiagnostic(error);
  if (!diagnostic) {
    return false;
  }

  return diagnostic.table === table && columns.includes(diagnostic.column as never);
}

export function isMissingProgressionPlaybookColumnError(error: SupabaseLikeError | null | undefined) {
  return isMissingColumnOnTable(error, "routine_day_exercises", PROGRESSION_PLAYBOOK_COLUMNS);
}

export function isMissingRoutineDefaultProgressionColumnError(error: SupabaseLikeError | null | undefined) {
  return isMissingColumnOnTable(error, "routines", ROUTINE_DEFAULT_PROGRESSION_COLUMNS);
}

export function isMissingSessionCopilotFeedbackEffortColumnError(error: SupabaseLikeError | null | undefined) {
  return isMissingColumnOnTable(error, "session_exercises", SESSION_COPILOT_FEEDBACK_EFFORT_COLUMNS);
}

function formatMissingColumn(diagnostic: MissingSchemaColumnDiagnostic) {
  return diagnostic.table ? `${diagnostic.table}.${diagnostic.column}` : diagnostic.column;
}

export function getSchemaMismatchMessage(
  error: SupabaseLikeError | null | undefined,
  options: {
    operation?: string;
    progressionMigration?: "045" | "046" | "045/046";
  } = {},
) {
  const diagnostic = getMissingSchemaColumnDiagnostic(error, options.operation);
  if (!diagnostic) {
    return null;
  }

  const missingColumn = formatMissingColumn(diagnostic);
  const isProgressionSchemaMissing =
    isMissingProgressionPlaybookColumnError(error)
    || isMissingRoutineDefaultProgressionColumnError(error);

  if (isProgressionSchemaMissing) {
    return `Progression schema is missing. Apply migration ${options.progressionMigration ?? "045/046"}. Missing ${missingColumn}.`;
  }

  return `Database schema is out of sync. Missing ${missingColumn}. Apply pending migrations before editing progression.`;
}

export function omitProgressionPlaybookColumns<T extends Record<string, unknown>>(payload: T) {
  const {
    progression_playbook_id: _progressionPlaybookId,
    progression_playbook_config: _progressionPlaybookConfig,
    ...legacyPayload
  } = payload;

  return legacyPayload;
}

export function omitRoutineDefaultProgressionColumns<T extends Record<string, unknown>>(payload: T) {
  const {
    default_progression_playbook_id: _defaultProgressionPlaybookId,
    default_progression_playbook_config: _defaultProgressionPlaybookConfig,
    ...legacyPayload
  } = payload;

  return legacyPayload;
}
