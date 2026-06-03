"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { updateQaLlelVisibilityAction } from "@/app/settings/actions";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { useToast } from "@/components/ui/ToastProvider";
import { appTokens } from "@/components/ui/app/tokens";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { cn } from "@/lib/cn";
import { resolveShowQaLlelDataPreference } from "@/lib/qa-data-visibility";
import type { ProfileRow } from "@/types/db";

type ExportFileType = "csv" | "json" | "xlsx";
type ExportScope = "all" | "history" | "routines";
type ExportPreview = {
  fileType: ExportFileType;
  scope: ExportScope;
  scopeLabel: string;
  scopeSummaryLabel: string;
  dateRange: {
    dateFrom: string | null;
    dateTo: string | null;
    label: string;
  };
  tables: Array<{
    key: string;
    name: string;
    rowCount: number;
    empty: boolean;
  }>;
  includesProgressionEvents: boolean;
  counts: {
    sessions: number;
    completedSessions: number;
    sessionExercises: number;
    sets: number;
    routines: number;
    routineDays: number;
    routineExercises: number;
    exercises: number;
    progressionEvents: number;
  };
};

const FILE_TYPE_OPTIONS: Array<{ value: ExportFileType; label: string; disabled?: boolean }> = [
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "csv", label: "CSV" },
  { value: "json", label: "JSON" },
];

const SCOPE_OPTIONS: Array<{ value: ExportScope; label: string }> = [
  { value: "all", label: "All" },
  { value: "history", label: "History" },
  { value: "routines", label: "Routines" },
];

function sanitizeExportNameInput(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
}

function getExportFormatNote(fileType: ExportFileType) {
  switch (fileType) {
    case "json":
      return "JSON keeps the same clean section split as the download, with separate history and routine data.";
    case "xlsx":
      return "Excel keeps one sheet per export section with only the relevant fields for that section.";
    default:
      return "CSV exports one clean table per section instead of one wide log filled with blanks.";
  }
}

export function DataSettingsSection({
  canAccessQaLlelUi,
  userKind,
  showQaLlelData,
  initialExportDateFrom,
  initialExportDateTo,
}: {
  canAccessQaLlelUi: boolean;
  userKind: ProfileRow["user_kind"];
  showQaLlelData?: boolean | null;
  initialExportDateFrom: string;
  initialExportDateTo: string;
}) {
  const initialShowQaLlelData = useMemo(() => resolveShowQaLlelDataPreference({
    show_qa_llel_data: showQaLlelData ?? null,
    user_kind: userKind,
  }), [showQaLlelData, userKind]);
  const [qaVisible, setQaVisible] = useState(initialShowQaLlelData);
  const [savedQaVisible, setSavedQaVisible] = useState(initialShowQaLlelData);
  const [exportType, setExportType] = useState<ExportFileType>("csv");
  const [exportScope, setExportScope] = useState<ExportScope>("all");
  const [exportName, setExportName] = useState("");
  const [dateFrom, setDateFrom] = useState(initialExportDateFrom);
  const [dateTo, setDateTo] = useState(initialExportDateTo);
  const [isSavingQaVisible, startQaVisibilitySave] = useTransition();
  const [isExporting, startExport] = useTransition();
  const [exportPreview, setExportPreview] = useState<ExportPreview | null>(null);
  const [exportPreviewError, setExportPreviewError] = useState<string | null>(null);
  const [isLoadingExportPreview, setIsLoadingExportPreview] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const controller = new AbortController();

    async function loadExportPreview() {
      setIsLoadingExportPreview(true);
      setExportPreviewError(null);

      try {
        const response = await fetch("/api/account/export/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileType: exportType,
            scope: exportScope,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          }),
          signal: controller.signal,
        });

        const result = await response.json().catch(() => ({ ok: false, error: "Unable to load export preview." }));
        if (!response.ok || !result?.ok || !result?.preview) {
          throw new Error(typeof result?.error === "string" ? result.error : "Unable to load export preview.");
        }

        setExportPreview(result.preview as ExportPreview);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setExportPreview(null);
        setExportPreviewError(error instanceof Error ? error.message : "Unable to load export preview.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingExportPreview(false);
        }
      }
    }

    void loadExportPreview();

    return () => controller.abort();
  }, [dateFrom, dateTo, exportScope, exportType]);

  const saveQaVisibility = (nextQaVisible: boolean) => {
    startQaVisibilitySave(async () => {
      const formData = new FormData();
      formData.set("showQaLlelData", nextQaVisible ? "1" : "0");

      const result = await updateQaLlelVisibilityAction(formData);
      if (!result.ok) {
        setQaVisible(savedQaVisible);
        toast.error(result.error, { id: "qa-visibility-error" });
        return;
      }

      setSavedQaVisible(nextQaVisible);
      toast.success(nextQaVisible ? "QA/LLEL data shown." : "QA/LLEL data hidden.", { id: "qa-visibility-saved" });
    });
  };

  const runExport = () => {
    startExport(async () => {
      try {
        const response = await fetch("/api/account/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileType: exportType,
            exportName: exportName.trim(),
            scope: exportScope,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          }),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({ error: "Export failed." }));
          throw new Error(typeof result?.error === "string" ? result.error : "Export failed.");
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const disposition = response.headers.get("Content-Disposition") ?? "";
        const filenameMatch = disposition.match(/filename="([^"]+)"/i);
        const filename = filenameMatch?.[1] ?? `fitness-export.${exportType}`;
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(downloadUrl);
        toast.success(`Export ready: ${filename}`, { id: "account-export-ready" });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Export failed.", { id: "account-export-error" });
      }
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <PublishBottomActions>
        {canAccessQaLlelUi ? (
          <BottomActionSplit
            secondary={(
              <button
                type="button"
                className={getAppButtonClassName({ variant: qaVisible ? "secondary" : "tertiary", fullWidth: true })}
                disabled={isSavingQaVisible}
                onClick={() => {
                  const nextQaVisible = !qaVisible;
                  setQaVisible(nextQaVisible);
                  saveQaVisibility(nextQaVisible);
                }}
              >
                {isSavingQaVisible ? "Saving..." : qaVisible ? "Hide QA" : "Show QA"}
              </button>
            )}
            primary={(
              <button
                type="button"
                className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
                disabled={isExporting}
                onClick={runExport}
              >
                {isExporting ? "Preparing..." : "Export"}
              </button>
            )}
          />
        ) : (
          <BottomActionSingle>
            <button
              type="button"
              className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
              disabled={isExporting}
              onClick={runExport}
            >
              {isExporting ? "Preparing..." : "Export"}
            </button>
          </BottomActionSingle>
        )}
      </PublishBottomActions>

      <div className="space-y-3 rounded-[var(--radius-lg)] border border-transparent bg-[rgb(var(--surface-1-rgb)/0.22)] p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.03)] sm:p-5">
        <LabeledEditorField
          label="Name"
          className="mx-auto w-full max-w-[22rem] border-[rgb(var(--border-strong)/0.18)] !bg-transparent shadow-none"
          labelClassName="mx-auto text-center"
        >
          <input
            type="text"
            value={exportName}
            onChange={(event) => setExportName(sanitizeExportNameInput(event.currentTarget.value))}
            placeholder="fitness-export"
            className={cn(
              labeledEditorFieldControlClassName,
              "auth-input-plain h-12 px-4 py-3 text-center !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
            )}
          />
        </LabeledEditorField>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={cn(appTokens.settingsFieldLabel, "text-center")}>From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.currentTarget.value)}
              className="h-12 w-full rounded-[0.95rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.16)] px-3 text-sm font-semibold text-[rgb(var(--text-primary)/0.96)] outline-none focus:border-[rgb(var(--accent-divider-rgb)/0.4)]"
            />
          </label>
          <label className="space-y-2">
            <span className={cn(appTokens.settingsFieldLabel, "text-center")}>To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.currentTarget.value)}
              className="h-12 w-full rounded-[0.95rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.16)] px-3 text-sm font-semibold text-[rgb(var(--text-primary)/0.96)] outline-none focus:border-[rgb(var(--accent-divider-rgb)/0.4)]"
            />
          </label>
        </div>

        <div className="space-y-2">
          <p className={cn(appTokens.settingsFieldLabel, "text-center")}>Type</p>
          <div className="grid grid-cols-3 gap-2">
            {FILE_TYPE_OPTIONS.map((option) => {
              const active = option.value === exportType;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex min-h-[3.25rem] items-center justify-center rounded-[0.95rem] border px-2 py-3 text-center text-sm font-semibold",
                    active
                      ? "border-[rgb(var(--accent-divider-rgb)/0.44)] bg-[rgb(var(--accent-divider-rgb)/0.1)] text-[rgb(var(--text-primary)/0.96)]"
                      : "border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.16)] text-[rgb(var(--text-secondary)/0.9)]",
                    option.disabled && "opacity-60",
                  )}
                >
                  <span>{option.label}</span>
                  <input
                    type="radio"
                    name="export-file-type"
                    value={option.value}
                    checked={active}
                    disabled={Boolean(option.disabled)}
                    onChange={() => {
                      if (!option.disabled) {
                        setExportType(option.value);
                      }
                    }}
                    className="sr-only"
                  />
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className={cn(appTokens.settingsFieldLabel, "text-center")}>Scope</p>
          <div className="grid grid-cols-3 gap-2">
            {SCOPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex min-h-[3.25rem] items-center justify-center rounded-[0.95rem] border px-2 py-3 text-center text-sm font-semibold",
                  option.value === exportScope
                    ? "border-[rgb(var(--accent-divider-rgb)/0.44)] bg-[rgb(var(--accent-divider-rgb)/0.1)] text-[rgb(var(--text-primary)/0.96)]"
                    : "border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.16)] text-[rgb(var(--text-secondary)/0.9)]",
                )}
              >
                <span>{option.label}</span>
                <input
                  type="radio"
                  name="export-scope"
                  value={option.value}
                  checked={option.value === exportScope}
                  onChange={() => setExportScope(option.value)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-[0.95rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.16)] p-4">
          <div className="space-y-1 text-center">
            <p className="text-sm font-semibold text-[rgb(var(--text-primary)/0.96)]">Export preview</p>
            <p className="text-xs leading-5 text-[rgb(var(--text-secondary)/0.88)]">{getExportFormatNote(exportType)}</p>
          </div>

          {isLoadingExportPreview ? (
            <p className="text-center text-sm text-[rgb(var(--text-secondary)/0.88)]">Loading preview…</p>
          ) : exportPreviewError ? (
            <p className="text-center text-sm text-[rgb(var(--danger-text-rgb)/0.96)]">{exportPreviewError}</p>
          ) : exportPreview ? (
            <div className="space-y-3">
              <div className="grid gap-2 text-center text-xs text-[rgb(var(--text-secondary)/0.88)] sm:grid-cols-3">
                <div className="rounded-[0.8rem] bg-[rgb(var(--surface-1-rgb)/0.34)] px-3 py-2">
                  <span className="block text-[0.7rem] uppercase tracking-[0.18em] text-[rgb(var(--text-muted)/0.82)]">Scope</span>
                  <span className="mt-1 block text-sm font-semibold text-[rgb(var(--text-primary)/0.96)]">{exportPreview.scopeLabel}</span>
                </div>
                <div className="rounded-[0.8rem] bg-[rgb(var(--surface-1-rgb)/0.34)] px-3 py-2">
                  <span className="block text-[0.7rem] uppercase tracking-[0.18em] text-[rgb(var(--text-muted)/0.82)]">Date range</span>
                  <span className="mt-1 block text-sm font-semibold text-[rgb(var(--text-primary)/0.96)]">{exportPreview.dateRange.label}</span>
                </div>
                <div className="rounded-[0.8rem] bg-[rgb(var(--surface-1-rgb)/0.34)] px-3 py-2">
                  <span className="block text-[0.7rem] uppercase tracking-[0.18em] text-[rgb(var(--text-muted)/0.82)]">Includes</span>
                  <span className="mt-1 block text-sm font-semibold text-[rgb(var(--text-primary)/0.96)]">{exportPreview.tables.length} sections</span>
                </div>
              </div>

              <div className="rounded-[0.8rem] bg-[rgb(var(--surface-1-rgb)/0.26)] px-3 py-3">
                <p className="text-center text-xs leading-5 text-[rgb(var(--text-secondary)/0.9)]">
                  <span className="font-semibold text-[rgb(var(--text-primary)/0.96)]">{exportPreview.scopeSummaryLabel}</span>
                  {" "}
                  {exportPreview.includesProgressionEvents ? "Progression events are included in this scope." : "Progression events are not part of this scope."}
                </p>
              </div>

              <div className="space-y-2">
                {exportPreview.tables.map((table) => (
                  <div
                    key={table.name}
                    className="flex items-center justify-between rounded-[0.8rem] bg-[rgb(var(--surface-1-rgb)/0.34)] px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-[rgb(var(--text-primary)/0.96)]">{table.name}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.88)]">
                      {table.rowCount} {table.rowCount === 1 ? "row" : "rows"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}
