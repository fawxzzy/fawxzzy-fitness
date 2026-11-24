// The Data settings export choices (file type and scope) survive a reload. They are a device preference, kept in
// localStorage like the app theme; nothing about them reaches the server.

export type ExportFileType = "csv" | "json" | "xlsx";
export type ExportScope = "all" | "history" | "routines";
export type ExportPreferences = { fileType: ExportFileType; scope: ExportScope };

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const EXPORT_PREFERENCES_STORAGE_KEY = "fawxzzy:export-preferences";
export const DEFAULT_EXPORT_PREFERENCES: ExportPreferences = { fileType: "csv", scope: "all" };

const FILE_TYPES: readonly ExportFileType[] = ["csv", "json", "xlsx"];
const SCOPES: readonly ExportScope[] = ["all", "history", "routines"];

export function parseExportPreferences(raw: string | null | undefined): ExportPreferences {
  if (!raw) return { ...DEFAULT_EXPORT_PREFERENCES };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return { ...DEFAULT_EXPORT_PREFERENCES };
    const record = value as Record<string, unknown>;
    return {
      fileType: FILE_TYPES.find((entry) => entry === record.fileType) ?? DEFAULT_EXPORT_PREFERENCES.fileType,
      scope: SCOPES.find((entry) => entry === record.scope) ?? DEFAULT_EXPORT_PREFERENCES.scope,
    };
  } catch {
    return { ...DEFAULT_EXPORT_PREFERENCES };
  }
}

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredExportPreferences(storage?: StorageLike | null): ExportPreferences {
  const target = resolveStorage(storage);
  if (!target) return { ...DEFAULT_EXPORT_PREFERENCES };
  try {
    return parseExportPreferences(target.getItem(EXPORT_PREFERENCES_STORAGE_KEY));
  } catch {
    return { ...DEFAULT_EXPORT_PREFERENCES };
  }
}

export function writeStoredExportPreferences(preferences: ExportPreferences, storage?: StorageLike | null) {
  const target = resolveStorage(storage);
  if (!target) return;
  try {
    target.setItem(EXPORT_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Private mode or a full quota: the choice just does not persist.
  }
}
