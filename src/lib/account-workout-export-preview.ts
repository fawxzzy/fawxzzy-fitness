import "server-only";

import {
  ACCOUNT_WORKOUT_EXPORT_JSON_TABLE_NAMES,
  buildAccountWorkoutExportCsvTables,
  buildAccountWorkoutExportWorkbookSheets,
  type AccountWorkoutExportFileType,
  type AccountWorkoutExportOptions,
  type AccountWorkoutExportPayload,
  type AccountWorkoutExportScope,
} from "@/lib/account-workout-export";

export type AccountWorkoutExportPreviewTable = {
  name: string;
  rowCount: number;
  empty: boolean;
};

export type AccountWorkoutExportPreview = {
  fileType: AccountWorkoutExportFileType;
  scope: AccountWorkoutExportScope;
  scopeLabel: string;
  dateRange: {
    dateFrom: string | null;
    dateTo: string | null;
    label: string;
  };
  routineScopeLabel: string;
  tables: AccountWorkoutExportPreviewTable[];
  includesProgressionEvents: boolean;
  counts: AccountWorkoutExportPayload["metadata"]["counts"];
};

function getScopeLabel(scope: AccountWorkoutExportScope) {
  switch (scope) {
    case "completed_only":
      return "Completed only";
    case "current_routine":
      return "Current routine";
    default:
      return "All workout data";
  }
}

function getDateRangeLabel(options: Pick<AccountWorkoutExportOptions, "dateFrom" | "dateTo">) {
  if (options.dateFrom && options.dateTo) {
    return `${options.dateFrom} to ${options.dateTo}`;
  }

  if (options.dateFrom) {
    return `From ${options.dateFrom}`;
  }

  if (options.dateTo) {
    return `Through ${options.dateTo}`;
  }

  return "All time";
}

function getRoutineScopeLabel(payload: AccountWorkoutExportPayload, scope: AccountWorkoutExportScope) {
  if (scope !== "current_routine") {
    return "All routines";
  }

  return payload.routines[0]?.name ?? "Current routine";
}

export function buildAccountWorkoutExportPreview(args: {
  payload: AccountWorkoutExportPayload;
  options: Pick<AccountWorkoutExportOptions, "fileType" | "scope" | "dateFrom" | "dateTo">;
}): AccountWorkoutExportPreview {
  const { payload, options } = args;
  let tables: AccountWorkoutExportPreviewTable[];

  if (options.fileType === "csv") {
    tables = buildAccountWorkoutExportCsvTables(payload).map((table) => ({
      name: table.name,
      rowCount: table.rows.length,
      empty: table.rows.length === 0,
    }));
  } else if (options.fileType === "xlsx") {
    tables = buildAccountWorkoutExportWorkbookSheets(payload).map((sheet) => ({
      name: sheet.name,
      rowCount: sheet.rows.length,
      empty: sheet.rows.length === 0,
    }));
  } else {
    tables = ACCOUNT_WORKOUT_EXPORT_JSON_TABLE_NAMES.map((name) => {
      const value = payload[name];
      const rowCount = Array.isArray(value)
        ? value.length
        : value
          ? 1
          : 0;

      return {
        name,
        rowCount,
        empty: rowCount === 0,
      };
    });
  }

  return {
    fileType: options.fileType,
    scope: options.scope,
    scopeLabel: getScopeLabel(options.scope),
    dateRange: {
      dateFrom: options.dateFrom ?? null,
      dateTo: options.dateTo ?? null,
      label: getDateRangeLabel(options),
    },
    routineScopeLabel: getRoutineScopeLabel(payload, options.scope),
    tables,
    includesProgressionEvents: tables.some((table) => table.name === "progression_events" || table.name === "Progression Events" || table.name === "progressionEvents"),
    counts: payload.metadata.counts,
  };
}
