import test from "node:test";
import assert from "node:assert/strict";

import { APP_NOTICE_ANCHOR_GAP_PX, computeNoticeAnchorTop } from "./app-notice-anchor.ts";

const rect = (bottom: number, height = 40) => ({ bottom, height });

test("notices sit just under an explicit header-row anchor when a screen marks one", () => {
  assert.equal(
    computeNoticeAnchorTop({ anchor: rect(96), floatingHeader: rect(140), topChrome: rect(60) }),
    96 + APP_NOTICE_ANCHOR_GAP_PX,
  );
});

test("without an explicit anchor, notices follow the floating header, then the top chrome", () => {
  assert.equal(computeNoticeAnchorTop({ floatingHeader: rect(140.4), topChrome: rect(60) }, 8), 148);
  assert.equal(computeNoticeAnchorTop({ topChrome: rect(60) }, 8), 68);
});

test("hidden or missing header elements are skipped and nothing measurable yields null (CSS fallback applies)", () => {
  assert.equal(computeNoticeAnchorTop({ anchor: rect(0, 0), floatingHeader: rect(120, 0), topChrome: rect(60) }, 8), 68);
  assert.equal(computeNoticeAnchorTop({}), null);
  assert.equal(computeNoticeAnchorTop({ topChrome: rect(Number.NaN) }), null);
});
