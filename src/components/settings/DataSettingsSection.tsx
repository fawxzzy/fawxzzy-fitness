"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { updateQaLlelVisibilityAction } from "@/app/settings/actions";
import { useIsOnline } from "@/components/session/useIsOnline";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { SettingsLoadState } from "@/components/settings/SettingsLoadState";
import { SettingsSwitchCard } from "@/components/settings/SettingsSwitchCard";
import { AppButton } from "@/components/ui/AppButton";
import { CardMeta, StatBlock } from "@/components/ui/card-system";
import { useFieldErrorNotice } from "@/components/ui/FieldNotice";
import { FormField, formFieldControlClassName } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/ToastProvider";
import { appTokens } from "@/components/ui/app/tokens";
import { buildAccountStorageSnapshot } from "@/lib/account-storage-model";
import { cn } from "@/lib/cn";
import {
  DEFAULT_EXPORT_PREFERENCES,
  readStoredExportPreferences,
  writeStoredExportPreferences,
  type ExportFileType,
  type ExportScope,
} from "@/lib/export-preferences";
import { resolveShowQaLlelDataPreference } from "@/lib/qa-data-visibility";
import type { ProfileRow } from "@/types/db";

type SaveQaVisibilityResult = { ok: true } | { ok: false; error: string };
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
  progressionSummary: {
    eventCount: number;
    promotionCount: number;
    deloadCount: number;
    manualChangeCount: number;
    revertCount: number;
    lockInCount: number;
    linkedSessionCount: number;
    distinctExerciseCount: number;
    firstChangeAt: string | null;
    latestChangeAt: string | null;
    lastPromotionAt: string | null;
  };
  counts: {
    sessions: number;
    completedSessions: number;
    visibleCompletedSessions?: number;
    hiddenQaCompletedSessions?: number;
    visibleSessionExercises?: number;
    sessionExercises: number;
    visibleSets?: number;
    sets: number;
    routines: number;
    routineDays: number;
    routineExercises: number;
    exercises: number;
    progressionEvents: number;
  };
};

const NETWORK_ERROR_COPY = "Could not reach the server. Check your connection and try again.";

/** The server action, behind a function so a test can hand the section its own save. */
function saveQaVisibilityWithServerAction(formData: FormData): Promise<SaveQaVisibilityResult> {
  return updateQaLlelVisibilityAction(formData);
}

const FILE_TYPE_OPTIONS: Array<{ value: ExportFileType; label: string }> = [
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

/** Radio group drawn as tiles. The native radios stay in the DOM (visually hidden), so keyboard and screen readers get a real group. */
function OptionTiles<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className={cn(appTokens.settingsFieldLabel, "mb-2 p-0")}>{legend}</legend>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex min-h-12 items-center justify-center rounded-[var(--radius-md)] border px-2 py-3 text-center text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[rgb(var(--accent)/0.5)]",
                active
                  ? "border-[rgb(var(--accent-divider-rgb)/0.44)] bg-[rgb(var(--accent-divider-rgb)/0.1)] text-[rgb(var(--text-primary)/0.96)]"
                  : "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.16)] text-[rgb(var(--text-secondary)/0.95)]",
              )}
            >
              <span>{option.label}</span>
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={active}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function DataSettingsSection({
  canAccessQaLlelUi,
  userKind,
  showQaLlelData,
  initialExportDateFrom,
  initialExportDateTo,
  saveQaVisibility = saveQaVisibilityWithServerAction,
}: {
  canAccessQaLlelUi: boolean;
  userKind: ProfileRow["user_kind"];
  showQaLlelData?: boolean | null;
  initialExportDateFrom: string;
  initialExportDateTo: string;
  /** Stores the QA visibility choice. Defaults to the server action; tests pass their own. */
  saveQaVisibility?: (formData: FormData) => Promise<SaveQaVisibilityResult>;
}) {
  const initialShowQaLlelData = useMemo(() => resolveShowQaLlelDataPreference({
    show_qa_llel_data: showQaLlelData ?? null,
    user_kind: userKind,
  }), [showQaLlelData, userKind]);
  const [qaVisible, setQaVisible] = useState(initialShowQaLlelData);
  const [savedQaVisible, setSavedQaVisible] = useState(initialShowQaLlelData);
  const [exportType, setExportType] = useState<ExportFileType>(DEFAULT_EXPORT_PREFERENCES.fileType);
  const [exportScope, setExportScope] = useState<ExportScope>(DEFAULT_EXPORT_PREFERENCES.scope);
  // The saved export choices load after hydration (localStorage is not on the server), then every change is stored.
  const [exportPrefsLoaded, setExportPrefsLoaded] = useState(false);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const isOnline = useIsOnline();
  const [exportName, setExportName] = useState("");
  const [dateFrom, setDateFrom] = useState(initialExportDateFrom);
  const [dateTo, setDateTo] = useState(initialExportDateTo);
  const [isSavingQaVisible, startQaVisibilitySave] = useTransition();
  const [isExporting, startExport] = useTransition();
  const [exportPreview, setExportPreview] = useState<ExportPreview | null>(null);
  const [exportPreviewError, setExportPreviewError] = useState<string | null>(null);
  const [isLoadingExportPreview, setIsLoadingExportPreview] = useState(true);
  const toast = useToast();
  // A failed load is announced once in the in-flow notice (never red text in the card); Retry sends it again.
  useFieldErrorNotice(exportPreviewError, { id: "export-preview-error" });
  const retryPreview = useCallback(() => setPreviewAttempt((attempt) => attempt + 1), []);

  const storageSnapshot = useMemo(() => (
    exportPreview ? buildAccountStorageSnapshot(exportPreview) : null
  ), [exportPreview]);

  const storageSections = useMemo(() => (
    storageSnapshot?.sections.map((section) => ({
      title: section.title,
      metrics: section.metrics.map((item) => ({
        label: item.label,
        value: item.value,
      })),
    })) ?? []
  ), [storageSnapshot]);
  const storageNoteItems = useMemo(() => {
    if (!exportPreview || !storageSnapshot) {
      return [] as string[];
    }

    const progression = `Progression: ${exportPreview.progressionSummary.promotionCount} promotions across ${exportPreview.progressionSummary.distinctExerciseCount} exercises.`;

    if (exportPreview.scope === "history") {
      return [
        "History counts match what History shows. Stored totals can also include hidden test data and sessions still in progress.",
        progression,
        "Progression changes are stored separately, so they do not always match one visible session.",
        `Total stored history records: ${storageSnapshot.totalRecordCount}.`,
      ];
    }

    if (exportPreview.scope === "routines") {
      return [
        "Routine counts reflect your saved routines only.",
        "Templates are not included yet and will join this scope when they exist.",
        `Total stored routine records: ${storageSnapshot.totalRecordCount}.`,
      ];
    }

    return [
      "This snapshot combines visible history with stored routine totals.",
      progression,
      "Stored totals can also include hidden test data, sessions still in progress, and progression changes that do not match one visible session.",
      `Total stored records across history and routines: ${storageSnapshot.totalRecordCount}.`,
    ];
  }, [exportPreview, storageSnapshot]);

  useEffect(() => {
    const stored = readStoredExportPreferences();
    setExportType(stored.fileType);
    setExportScope(stored.scope);
    setExportPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!exportPrefsLoaded) return;
    writeStoredExportPreferences({ fileType: exportType, scope: exportScope });
  }, [exportPrefsLoaded, exportScope, exportType]);

  useEffect(() => {
    // Wait for the saved choices, and for a connection: offline there is nothing to ask the server.
    if (!exportPrefsLoaded || !isOnline) {
      return;
    }
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
        setExportPreviewError(
          error instanceof TypeError ? NETWORK_ERROR_COPY : error instanceof Error ? error.message : "Unable to load export preview.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingExportPreview(false);
        }
      }
    }

    void loadExportPreview();

    return () => controller.abort();
  }, [dateFrom, dateTo, exportPrefsLoaded, exportScope, exportType, isOnline, previewAttempt]);

  const changeQaVisibility = (nextQaVisible: boolean) => {
    setQaVisible(nextQaVisible);
    startQaVisibilitySave(async () => {
      const formData = new FormData();
      formData.set("showQaLlelData", nextQaVisible ? "1" : "0");

      const result = await saveQaVisibility(formData);
      if (!result.ok) {
        setQaVisible(savedQaVisible);
        toast.error(result.error, { id: "qa-visibility-error" });
        return;
      }

      setSavedQaVisible(nextQaVisible);
      toast.success(nextQaVisible ? "QA data shown." : "QA data hidden.", { id: "qa-visibility-saved" });
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
        toast.error(
          error instanceof TypeError ? NETWORK_ERROR_COPY : error instanceof Error ? error.message : "Export failed.",
          { id: "account-export-error" },
        );
      }
    });
  };

  // What a card shows in place of its data: loading, offline, or failed (the failure text itself is in the notice).
  const renderUnavailable = (subject: string) => {
    if (isLoadingExportPreview && isOnline) {
      return <SettingsLoadState kind="loading">Loading {subject}...</SettingsLoadState>;
    }
    if (!isOnline) {
      return <SettingsLoadState kind="offline">You are offline. Reconnect to load your {subject}.</SettingsLoadState>;
    }
    return (
      <SettingsLoadState kind="error" onRetry={retryPreview}>
        Could not load your {subject}.
      </SettingsLoadState>
    );
  };

  return (
    <div className="space-y-3">
      {canAccessQaLlelUi ? (
        <SettingsSwitchCard
          title="QA data"
          meta={<CardMeta items={[qaVisible ? "Shown in History and totals" : "Hidden from History and totals"]} />}
          checked={qaVisible}
          ariaLabel="Show QA data"
          saving={isSavingQaVisible}
          onChange={changeQaVisibility}
          data-settings-qa-switch="true"
        />
      ) : null}

      <SettingsCard
        title="Stored snapshot"
        tone="logged"
        meta={(
          <CardMeta
            items={[
              exportPreview
                ? `${exportPreview.scopeLabel} scope`
                : "Scope-aware stored snapshot",
              exportPreview ? (storageSnapshot?.historyRangeLabel ?? exportPreview.dateRange.label) : "",
            ]}
          />
        )}
      >
        {!storageSnapshot ? (
          renderUnavailable("stored snapshot")
        ) : (
          <>
            {storageSections.map((section) => (
              <div key={section.title} className="space-y-2">
                {storageSections.length > 1 ? (
                  <h4 className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted)/0.98)]">
                    {section.title}
                  </h4>
                ) : null}
                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  {section.metrics.map((metric) => (
                    <StatBlock key={metric.label} label={metric.label} values={[metric.value]} />
                  ))}
                </div>
              </div>
            ))}
            <ul className="m-0 grid list-disc gap-1.5 pl-5 text-xs leading-snug text-[rgb(var(--text-secondary)/0.95)]">
              <li>
                Current snapshot follows the selected{" "}
                <span className="font-semibold text-[rgb(var(--text-primary)/0.96)]">{exportPreview?.scopeLabel ?? "selected"}</span>{" "}
                export scope.
              </li>
              <li>
                Snapshot range:{" "}
                <span className="font-semibold text-[rgb(var(--text-primary)/0.96)]">{storageSnapshot.historyRangeLabel}</span>.
              </li>
              {storageNoteItems.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </>
        )}
      </SettingsCard>

      <SettingsCard title="Export">
        <FormField label="Export name" className="w-full">
          {(control) => (
          <input
            {...control}
            type="text"
            value={exportName}
            onChange={(event) => setExportName(sanitizeExportNameInput(event.currentTarget.value))}
            placeholder="fitness-export"
            className={cn(formFieldControlClassName, "text-center")}
          />
          )}
        </FormField>

        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          <FormField label="From">
            {(control) => (
              <input
                {...control}
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.currentTarget.value)}
                className={cn(formFieldControlClassName, "font-semibold")}
              />
            )}
          </FormField>
          <FormField label="To">
            {(control) => (
              <input
                {...control}
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.currentTarget.value)}
                className={cn(formFieldControlClassName, "font-semibold")}
              />
            )}
          </FormField>
        </div>

        <OptionTiles legend="Type" name="export-file-type" options={FILE_TYPE_OPTIONS} value={exportType} onChange={setExportType} />
        <OptionTiles legend="Scope" name="export-scope" options={SCOPE_OPTIONS} value={exportScope} onChange={setExportScope} />

        <AppButton type="button" variant="primary" fullWidth loading={isExporting} disabled={!isOnline} onClick={runExport}>
          Export
        </AppButton>
      </SettingsCard>

      <SettingsCard title="Export preview" meta={<CardMeta items={[getExportFormatNote(exportType)]} />}>
        {!exportPreview ? (
          renderUnavailable("preview")
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBlock label="Scope" values={[exportPreview.scopeLabel]} />
              <StatBlock label="Date range" values={[exportPreview.dateRange.label]} />
              <StatBlock label="Includes" values={[`${exportPreview.tables.length} sections`]} />
            </div>

            <p className="m-0 text-xs leading-snug text-[rgb(var(--text-secondary)/0.95)]">
              <span className="font-semibold text-[rgb(var(--text-primary)/0.96)]">{exportPreview.scopeSummaryLabel}</span>
              {" "}
              {exportPreview.includesProgressionEvents ? "Progression events are included in this scope." : "Progression events are not part of this scope."}
            </p>

            <ul className="m-0 grid list-none gap-0 divide-y divide-[rgb(var(--border-strong)/0.14)] p-0">
              {exportPreview.tables.map((table) => (
                <li key={table.name} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 text-sm font-semibold text-[rgb(var(--text-primary)/0.96)] [overflow-wrap:anywhere]">{table.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-[rgb(var(--text-secondary)/0.95)]">
                    {table.rowCount} {table.rowCount === 1 ? "row" : "rows"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </SettingsCard>
    </div>
  );
}
