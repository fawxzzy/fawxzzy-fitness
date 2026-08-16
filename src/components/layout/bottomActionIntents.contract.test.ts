import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

import {
  BOTTOM_ACTION_BUTTON_BASE_CLASS_NAME,
} from "./bottomActionIntents";
import {
  BOTTOM_ACTION_SPLIT_LAYOUT_CLASSNAME,
  BOTTOM_ACTION_TRIAD_LAYOUT_CLASSNAME,
} from "./CanonicalBottomActions";

test("canonical bottom actions retain accessible targets and narrow-layout reflow", () => {
  assert.match(BOTTOM_ACTION_BUTTON_BASE_CLASS_NAME, /(?:^|\s)min-h-11(?:\s|$)/);
  assert.doesNotMatch(BOTTOM_ACTION_BUTTON_BASE_CLASS_NAME, /min-h-\[(?:4[0-3]|[0-3]?\d)px\]/);

  assert.equal(
    BOTTOM_ACTION_SPLIT_LAYOUT_CLASSNAME,
    "grid-cols-[minmax(112px,0.92fr)_minmax(0,1.78fr)] max-[359px]:grid-cols-1",
  );
  assert.equal(
    BOTTOM_ACTION_TRIAD_LAYOUT_CLASSNAME,
    "grid-cols-[minmax(112px,0.92fr)_minmax(5.75rem,7.25rem)_minmax(0,1.42fr)] max-[359px]:grid-cols-1",
  );

  const sessionSource = fs.readFileSync(path.resolve(process.cwd(), "src/components/SessionPageClient.tsx"), "utf8");
  assert.match(
    sessionSource,
    /grid-cols-\[minmax\(84px,0\.72fr\)_minmax\(6\.5rem,7\.8rem\)_minmax\(0,1\.16fr\)\][^"\n]*max-\[359px\]:grid-cols-1/,
  );
});
