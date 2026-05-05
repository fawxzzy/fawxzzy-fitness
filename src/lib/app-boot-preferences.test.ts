import test from "node:test";
import assert from "node:assert/strict";
import { AMBIENT_THEME_STORAGE_KEY, writeStoredAmbientTheme } from "@/lib/ambient/theme";
import {
  APP_BOOT_PREFERENCES_COOKIE_KEY,
  APP_BOOT_PREFERENCES_STORAGE_KEY,
  mergeAppBootPreferences,
  parseAppBootPreferencesValue,
  readAppBootPreferencesCookie,
  readStoredAppBootPreferences,
  resolveAppBootPreferences,
  serializeAppBootPreferences,
  writeAppBootPreferencesCookie,
  writeStoredAppBootPreferences,
} from "@/lib/app-boot-preferences";
import {
  APP_THEME_SELECTION_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  TEST_APP_THEME,
  writeStoredAppTheme,
  writeStoredAppThemeSelection,
} from "@/lib/app-theme";

function createStorageStub() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    entries() {
      return Array.from(store.entries());
    },
  };
}

function createCookieDocumentStub(initialCookie = "") {
  let cookie = initialCookie;

  return {
    get cookie() {
      return cookie;
    },
    set cookie(value: string) {
      const [pair] = value.split(";");
      const [rawKey, ...rawValueParts] = pair.split("=");
      const key = rawKey?.trim() ?? "";
      const nextValue = rawValueParts.join("=");
      const entries = cookie
        .split(/;\s*/)
        .filter(Boolean)
        .filter((entry) => !entry.startsWith(`${key}=`));

      if (!value.includes("Max-Age=0")) {
        entries.push(`${key}=${nextValue}`);
      }

      cookie = entries.join("; ");
    },
  };
}

test("boot preference parser accepts a valid versioned snapshot", () => {
  const rawValue = serializeAppBootPreferences({
    version: 1,
    updatedAt: "2026-05-04T12:00:00.000Z",
    themeSelection: "rose",
    theme: TEST_APP_THEME,
    ambientTheme: "mint",
    displayMode: "standalone",
  });

  assert.deepEqual(parseAppBootPreferencesValue(rawValue), {
    version: 1,
    updatedAt: "2026-05-04T12:00:00.000Z",
    themeSelection: "rose",
    theme: TEST_APP_THEME,
    ambientTheme: "mint",
    displayMode: "standalone",
  });
});

test("boot preference parser rejects invalid JSON or mismatched versions", () => {
  assert.equal(parseAppBootPreferencesValue("{"), null);
  assert.equal(parseAppBootPreferencesValue(JSON.stringify({
    version: 2,
    updatedAt: "2026-05-04T12:00:00.000Z",
  })), null);
});

test("boot preference parser rejects invalid theme fields", () => {
  assert.equal(parseAppBootPreferencesValue(JSON.stringify({
    version: 1,
    updatedAt: "2026-05-04T12:00:00.000Z",
    theme: {
      ...TEST_APP_THEME,
      primaryActionColor: "not-a-color",
    },
  })), null);
  assert.equal(parseAppBootPreferencesValue(JSON.stringify({
    version: 1,
    updatedAt: "2026-05-04T12:00:00.000Z",
    theme: {
      ...TEST_APP_THEME,
      buttonRadius: 999,
    },
  })), null);
});

test("boot preference serialization omits unknown sensitive-looking fields", () => {
  const serialized = serializeAppBootPreferences({
    version: 1,
    updatedAt: "2026-05-04T12:00:00.000Z",
    themeSelection: "default",
    theme: TEST_APP_THEME,
    ambientTheme: "violet",
    displayMode: "browser",
    accessToken: "secret",
  } as unknown as Parameters<typeof serializeAppBootPreferences>[0]);

  assert.equal(serialized.includes("accessToken"), false);
  assert.equal(serialized.includes("secret"), false);
});

test("boot preference cookie reader prefers the cookie snapshot and ignores invalid values", () => {
  const validCookie = `${APP_BOOT_PREFERENCES_COOKIE_KEY}=${encodeURIComponent(serializeAppBootPreferences({
    version: 1,
    updatedAt: "2026-05-04T12:00:00.000Z",
    ambientTheme: "ember",
  }))}`;

  assert.deepEqual(readAppBootPreferencesCookie(validCookie), {
    version: 1,
    updatedAt: "2026-05-04T12:00:00.000Z",
    ambientTheme: "ember",
  });
  assert.equal(readAppBootPreferencesCookie(`${APP_BOOT_PREFERENCES_COOKIE_KEY}=%7B`), null);
});

test("boot preference merge writes storage and cookie snapshots", () => {
  const storage = createStorageStub();
  const document = createCookieDocumentStub();

  const merged = mergeAppBootPreferences({
    themeSelection: "custom-1",
    theme: {
      ...TEST_APP_THEME,
      primaryActionColor: "#335577",
    },
    ambientTheme: "mint",
    displayMode: "standalone",
    updatedAt: "2026-05-04T12:34:56.000Z",
  }, {
    storage,
    document,
  });

  assert.deepEqual(merged, {
    version: 1,
    updatedAt: "2026-05-04T12:34:56.000Z",
    themeSelection: "custom-1",
    theme: {
      ...TEST_APP_THEME,
      primaryActionColor: "#335577",
    },
    ambientTheme: "mint",
    displayMode: "standalone",
  });
  assert.deepEqual(readStoredAppBootPreferences(storage), merged);
  assert.deepEqual(readAppBootPreferencesCookie(document.cookie), merged);
});

test("boot preference resolver prefers cookie over storage", () => {
  const storage = createStorageStub();
  writeStoredAppBootPreferences({
    version: 1,
    updatedAt: "2026-05-04T12:00:00.000Z",
    ambientTheme: "mint",
  }, storage);

  const cookieValue = `${APP_BOOT_PREFERENCES_COOKIE_KEY}=${encodeURIComponent(serializeAppBootPreferences({
    version: 1,
    updatedAt: "2026-05-04T13:00:00.000Z",
    ambientTheme: "violet",
  }))}`;

  assert.deepEqual(resolveAppBootPreferences({
    storage,
    cookieString: cookieValue,
  }), {
    version: 1,
    updatedAt: "2026-05-04T13:00:00.000Z",
    ambientTheme: "violet",
  });
});

test("theme persistence can mirror legacy storage into the boot preference snapshot", () => {
  const storage = createStorageStub();
  const document = createCookieDocumentStub();

  writeStoredAppTheme({
    ...TEST_APP_THEME,
    primaryActionColor: "#446688",
  }, storage);
  writeStoredAppThemeSelection("custom-2", storage);
  writeStoredAmbientTheme("mint", storage);

  mergeAppBootPreferences({
    themeSelection: storage.getItem(APP_THEME_SELECTION_STORAGE_KEY) as "custom-2",
    theme: JSON.parse(storage.getItem(APP_THEME_STORAGE_KEY) ?? "null")?.theme ?? null,
    ambientTheme: storage.getItem(AMBIENT_THEME_STORAGE_KEY) as "mint",
    updatedAt: "2026-05-04T14:00:00.000Z",
  }, {
    storage,
    document,
  });

  const bootPreferences = readStoredAppBootPreferences(storage);
  assert.equal(storage.getItem(APP_THEME_STORAGE_KEY) !== null, true);
  assert.equal(storage.getItem(APP_THEME_SELECTION_STORAGE_KEY), "custom-2");
  assert.equal(storage.getItem(APP_BOOT_PREFERENCES_STORAGE_KEY) !== null, true);
  assert.equal(bootPreferences?.theme?.primaryActionColor, "#446688");
  assert.equal(bootPreferences?.ambientTheme, "mint");
  assert.match(document.cookie, new RegExp(`^${APP_BOOT_PREFERENCES_COOKIE_KEY}=`));
});

test("boot preference cookie writer clears the cookie when requested", () => {
  const document = createCookieDocumentStub(`${APP_BOOT_PREFERENCES_COOKIE_KEY}=persisted`);

  writeAppBootPreferencesCookie(null, document);

  assert.equal(document.cookie.includes(APP_BOOT_PREFERENCES_COOKIE_KEY), false);
});
