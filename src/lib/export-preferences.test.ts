import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_EXPORT_PREFERENCES,
  EXPORT_PREFERENCES_STORAGE_KEY,
  parseExportPreferences,
  readStoredExportPreferences,
  writeStoredExportPreferences,
} from "@/lib/export-preferences";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    map,
  };
}

test("export preferences: defaults are CSV and All scope", () => {
  assert.deepEqual(DEFAULT_EXPORT_PREFERENCES, { fileType: "csv", scope: "all" });
});

test("export preferences: parse keeps valid values and falls back per field", () => {
  assert.deepEqual(parseExportPreferences(JSON.stringify({ fileType: "xlsx", scope: "history" })), { fileType: "xlsx", scope: "history" });
  assert.deepEqual(parseExportPreferences(JSON.stringify({ fileType: "pdf", scope: "routines" })), { fileType: "csv", scope: "routines" });
  assert.deepEqual(parseExportPreferences(JSON.stringify({ fileType: "json", scope: 4 })), { fileType: "json", scope: "all" });
});

test("export preferences: junk and empty input return the defaults", () => {
  for (const raw of [null, "", "not json", "[]", "null", "12"]) {
    assert.deepEqual(parseExportPreferences(raw), DEFAULT_EXPORT_PREFERENCES);
  }
});

test("export preferences: write then read round-trips through storage", () => {
  const storage = memoryStorage();
  writeStoredExportPreferences({ fileType: "json", scope: "routines" }, storage);
  assert.ok(storage.map.has(EXPORT_PREFERENCES_STORAGE_KEY));
  assert.deepEqual(readStoredExportPreferences(storage), { fileType: "json", scope: "routines" });
});

test("export preferences: a storage that throws never breaks the screen", () => {
  const broken = {
    getItem: () => { throw new Error("denied"); },
    setItem: () => { throw new Error("denied"); },
    removeItem: () => { throw new Error("denied"); },
  };
  assert.deepEqual(readStoredExportPreferences(broken), DEFAULT_EXPORT_PREFERENCES);
  assert.doesNotThrow(() => writeStoredExportPreferences({ fileType: "xlsx", scope: "all" }, broken));
  assert.deepEqual(readStoredExportPreferences(null), DEFAULT_EXPORT_PREFERENCES);
});
