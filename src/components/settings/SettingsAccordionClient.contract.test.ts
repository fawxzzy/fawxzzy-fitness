import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const accordionSource = readFileSync(fileURLToPath(new URL("./SettingsAccordionClient.tsx", import.meta.url)), "utf8");
const stateSource = readFileSync(fileURLToPath(new URL("./SettingsScreenState.tsx", import.meta.url)), "utf8");

test("legacy migration settings stay compiled but hidden from the active Settings UI", () => {
  assert.match(stateSource, /SETTINGS_LEGACY_MIGRATION_ENABLED = false/);
  assert.match(accordionSource, /SETTINGS_LEGACY_MIGRATION_ENABLED \? \{ title: "Legacy & Migration" \} : null/);
  assert.match(accordionSource, /SETTINGS_LEGACY_MIGRATION_ENABLED && \(expandedSection === null \|\| expandedSection === "legacy"\)/);
});
