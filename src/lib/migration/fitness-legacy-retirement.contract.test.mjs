import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { POST } from "../../app/api/migration/export/route.ts";
import * as bridge from "./fitness-legacy-bridge.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("retired export returns 410 without parsing credentials or contacting a backend", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("retired export attempted network access"); };
  try {
    const response = POST({ json() { throw new Error("retired export read credentials"); } });
    assert.equal(response.status, 410);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.code, "FITNESS_LEGACY_EXPORT_RETIRED");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the bridge exposes offline recovery helpers and no remote exporter", () => {
  assert.equal(typeof bridge.importFitnessLegacySnapshot, "function");
  assert.equal(typeof bridge.getFitnessLegacyImportConflicts, "function");
  assert.equal(typeof bridge.isFitnessLegacySnapshot, "function");
  assert.equal("exportFitnessLegacySnapshot" in bridge, false);
  assert.doesNotMatch(read("./fitness-legacy-bridge.ts"), /createClient|signInWithPassword|LEGACY_SUPABASE_|legacyAccessToken/);
});

test("active server configuration and dev forwarding no longer consume legacy credentials", () => {
  for (const path of ["../env.ts", "../../app/settings/page.tsx", "../../../scripts/dev.mjs"]) {
    assert.doesNotMatch(read(path), /LEGACY_SUPABASE_(?:URL|ANON_KEY)/, path);
  }
  assert.match(read("../../app/settings/page.tsx"), /const legacyBridgeConfigured = false;/);
  assert.match(read("../../components/settings/SettingsScreenState.tsx"), /SETTINGS_LEGACY_MIGRATION_ENABLED = false;/);
});

test("import and parity retain authenticated master-client recovery routes", () => {
  for (const route of ["import", "parity"]) {
    const source = read(`../../app/api/migration/${route}/route.ts`);
    assert.match(source, /await requireUser\(/);
    assert.match(source, /supabaseAdmin\(\)/);
    assert.doesNotMatch(source, /LEGACY_SUPABASE_|createLegacyClient|exportFitnessLegacySnapshot/);
  }
});
