import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pageSource = readFileSync(fileURLToPath(new URL("./page.tsx", import.meta.url)), "utf8");

test("privacy policy source does not include public draft notice language", () => {
  assert.doesNotMatch(pageSource, /not legal advice/i);
  assert.doesNotMatch(pageSource, /internal operating draft/i);
  assert.match(pageSource, /Privacy Policy/);
  assert.match(pageSource, /operated by Zachariah John Harold Redfield/);
  assert.match(pageSource, /Paid Pro subscriptions are intended only for users who are at least 18 years old/);
  assert.match(pageSource, /Payments are processed by Stripe\./);
  assert.match(pageSource, /workout data can still be personal and sensitive/i);
  assert.match(pageSource, /private support path/i);
});
