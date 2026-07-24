import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("./page.tsx", import.meta.url);

test("mobile regression fixtures remain production-blocked and preview-reviewable", async () => {
  const source = await readFile(pageUrl, "utf8");

  assert.match(source, /process\.env\.HISTORY_QA_PREVIEW_ENABLED === "1"/);
  assert.match(source, /process\.env\.NODE_ENV === "production" && !isReviewPreviewEnabled/);
  assert.match(source, /allowProductionPreview=\{isReviewPreviewEnabled\}/);
  assert.match(source, /notFound\(\)/);
});

test("mobile regression surface preserves the production guard unless the server gate admits review", async () => {
  const source = await readFile(new URL("./DevMobileRegressionRoute.tsx", import.meta.url), "utf8");

  assert.match(source, /allowProductionPreview = false/);
  assert.match(source, /process\.env\.NODE_ENV === "production" && !allowProductionPreview/);
});
