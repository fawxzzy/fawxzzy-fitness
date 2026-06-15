import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("routine browse card shows a two-column workout-plan preview without plus-more compression", () => {
  const source = readFileSync(new URL("./RoutineBrowseCard.tsx", import.meta.url), "utf8");

  assert.match(source, /import \{ HorizontalScrollHint \} from "@\/components\/ui\/HorizontalScrollHint"/);
  assert.match(source, /<HorizontalScrollHint/);
  assert.match(source, /ROUTINES_BROWSE_CARD_PREVIEW_SCROLL_CLASS_NAME/);
  assert.match(source, /showEdgeFades=\{false\}/);
  assert.match(source, /ROUTINES_BROWSE_CARD_CHEVRON_OVERLAY_CLASS_NAME/);
  assert.match(source, /rightIconMode="overlay"/);
  assert.match(source, /items-center gap-2/);
  assert.match(source, /ROUTINES_BROWSE_CARD_REST_PREVIEW_TILE_CLASS_NAME/);
  assert.doesNotMatch(source, /remainingPreviewDayCount/);
  assert.doesNotMatch(source, /\+\\?\{?routine\.remainingPreviewDayCount/);
  assert.doesNotMatch(source, /ACTIVE/);
  assert.doesNotMatch(source, /Slot \{day\.dayIndex\}/);
  assert.doesNotMatch(source, /tone="warning" className=\{ROUTINES_BROWSE_CARD_TAG_SPACING_CLASS_NAME\}>Rest/);
  assert.match(source, /<SignatureMiniPipe className="self-center" \/>/);
  assert.match(source, /<MetricAccentBar variant="thin" className="mt-1 w-16 opacity-85" \/>/);
  assert.match(source, /<AppBadge key=\{part\} tone="default"/);
  assert.match(source, /ROUTINES_BROWSE_CARD_SUMMARY_ROW_CLASS_NAME/);
  assert.match(source, /titleClassName="text-center"/);
  assert.match(source, /buildRoutineSplitParts\(day\.splitSummary\)/);
  assert.match(source, /Created \$\{formatDateShort\(normalizedValue\)\}/);
});
