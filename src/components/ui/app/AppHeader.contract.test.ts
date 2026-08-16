import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("centered headers retain one-line phone title room beside one action", () => {
  const source = readFileSync(new URL("./AppHeader.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /max-w-\[calc\(100%-3\.75rem\)\] px-1 sm:max-w-\[calc\(100%-4rem\)\] sm:px-1/,
  );
  assert.match(source, /hasRightRail\s*\?\s*CENTERED_HEADER_COPY_COLUMN_WITH_ACTION_CLASSNAME/);
  assert.doesNotMatch(source, /max-w-\[calc\(100%-4\.85rem\)\]/);
});
