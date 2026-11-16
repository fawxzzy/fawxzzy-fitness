import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const layoutSource = readFileSync(fileURLToPath(new URL("./LegalDocumentLayout.tsx", import.meta.url)), "utf8");

test("legal document layout uses the one detail header with Back on the left", () => {
  assert.match(layoutSource, /<ScreenHeader kind="detail" title=\{title\} back=\{<ScreenHeaderBackButton href=\{backHref\} label="Back" \/>\} \/>/);
  assert.doesNotMatch(layoutSource, /\beyebrow\??:|MetricAccentBar|<h1|backgroundSize/);
  assert.doesNotMatch(layoutSource, />\s*Back\s*</);
});

test("legal document layout does not render top cross-links between legal pages", () => {
  assert.doesNotMatch(layoutSource, /LegalInlineLinks/);
});

test("legal document layout keeps last-updated data out of visible header copy", () => {
  assert.match(layoutSource, /void lastUpdated/);
  assert.doesNotMatch(layoutSource, /Last updated \{lastUpdated\}/);
});
