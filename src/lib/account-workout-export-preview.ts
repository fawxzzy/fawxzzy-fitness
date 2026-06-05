import "server-only";

import {
  buildAccountWorkoutExportSections,
  type AccountWorkoutExportFileType,
  type AccountWorkoutExportOptions,
  type AccountWorkoutExportPayload,
  type AccountWorkoutExportScope,
  type AccountWorkoutExportSectionKey,
} from "@/lib/account-workout-export";

export type AccountWorkoutExportPreviewTable = {
  key: AccountWorkoutExportSectionKey;
  name: string;
  rowCount: number;
  empty: boolean;
};

export type AccountWorkoutExportPreview = {
  fileType: AccountWorkoutExportFileType;
  scope: AccountWorkoutExportScope;
  scopeLabel: string;
  scopeSummaryLabel: string;
  dateRange: {
    dateFrom: string | null;
    dateTo: string | null;
    label: string;
  };
  tables: AccountWorkoutExportPreviewTable[];
  includesProgressionEvents: boolean;
  counts: AccountWorkoutExportPayload["metadata"]["counts"] & {
    visibleCompletedSessions?: number;
    hiddenQaCompletedSessions?: number;
    visibleSessionExercises?: number;
    visibleSets?: number;
  };
};

function getScopeLabel(scope: AccountWorkoutExportScope) {
  switch (scope) {
    case "history":
      return "History";
    case "routines":
      return "Routines";
    default:
      return "All";
  }
}

function getScopeSummaryLabel(scope: AccountWorkoutExportScope) {
  switch (scope) {
    case "history":
      return "History exports only session, set, and progression data.";
    case "routines":
      return "Routines exports routine builds now and templates when they are added.";
    default:
      return "All exports combine routines with history data.";
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

export function buildAccountWorkoutExportPreview(args: {
  payload: AccountWorkoutExportPayload;
  options: Pick<AccountWorkoutExportOptions, "fileType" | "scope" | "dateFrom" | "dateTo">;
}): AccountWorkoutExportPreview {
  const { payload, options } = args;
  const sections = buildAccountWorkoutExportSections(payload);
  const tables = sections.map((section) => ({
    key: section.key,
    name: section.label,
    rowCount: section.rows.length,
    empty: section.rows.length === 0,
  }));

  return {
    fileType: options.fileType,
    scope: options.scope,
    scopeLabel: getScopeLabel(options.scope),
    scopeSummaryLabel: getScopeSummaryLabel(options.scope),
    dateRange: {
      dateFrom: options.dateFrom ?? null,
      dateTo: options.dateTo ?? null,
      label: getDateRangeLabel(options),
    },
    tables,
    includesProgressionEvents: sections.some((section) => section.key === "historyProgressionEvents"),
    counts: payload.metadata.counts,
  };
}
