import assert from "node:assert/strict";
import test from "node:test";

import { buildHistoryDayBandLayout, buildHistoryValueGridTicks, resolveHistorySetPlotY, resolveHistorySetSlotX } from "@/lib/exercise-info-history-layout";

test("buildHistoryDayBandLayout favors logged days over filler calendar days", () => {
  const layout = buildHistoryDayBandLayout({
    dayKeys: ["2026-04-29", "2026-04-30", "2026-05-01", "2026-05-02", "2026-05-03"],
    actualDayKeys: new Set(["2026-04-29", "2026-05-03"]),
    leftGutter: 42,
    innerWidth: 452,
    setCountsByDay: new Map([
      ["2026-04-29", 2],
      ["2026-05-03", 4],
    ]),
    changeCountsByDay: new Map(),
  });

  const firstLoggedDay = layout.slotWidthByDayKey.get("2026-04-29");
  const fillerDay = layout.slotWidthByDayKey.get("2026-04-30");
  const denseLoggedDay = layout.slotWidthByDayKey.get("2026-05-03");

  assert.equal(typeof firstLoggedDay, "number");
  assert.equal(typeof fillerDay, "number");
  assert.equal(typeof denseLoggedDay, "number");
  assert.ok(firstLoggedDay! > fillerDay!);
  assert.ok(denseLoggedDay! > firstLoggedDay!);
});

test("resolveHistorySetSlotX spaces same-day set points across the day's mini-axis", () => {
  const layout = buildHistoryDayBandLayout({
    dayKeys: ["2026-05-03"],
    actualDayKeys: new Set(["2026-05-03"]),
    leftGutter: 42,
    innerWidth: 452,
    setCountsByDay: new Map([["2026-05-03", 4]]),
    changeCountsByDay: new Map(),
  });
  const band = layout.bandByDayKey.get("2026-05-03");
  assert.ok(band);

  const positions = [0, 1, 2, 3].map((pointIndex) => resolveHistorySetSlotX({
    band,
    baseX: band!.centerX,
    daySlotWidth: band!.width,
    pointIndex,
    pointsInDay: 4,
  }));

  assert.equal(positions[0], band!.innerStartX);
  assert.equal(positions[3], band!.innerEndX);
  assert.ok(positions[0]! < positions[1]!);
  assert.ok(positions[1]! < positions[2]!);
  assert.ok(positions[2]! < positions[3]!);
});

test("resolveHistorySetSlotX falls back to symmetric spread without a day band", () => {
  const positions = [0, 1, 2].map((pointIndex) => resolveHistorySetSlotX({
    band: null,
    baseX: 200,
    daySlotWidth: 18,
    pointIndex,
    pointsInDay: 3,
  }));

  assert.equal(positions[1], 200);
  assert.ok(positions[0]! < positions[1]!);
  assert.ok(positions[1]! < positions[2]!);
});

test("day-band layout preserves chronological ordering and gives denser days more in-band span", () => {
  const layout = buildHistoryDayBandLayout({
    dayKeys: ["2026-04-29", "2026-04-30", "2026-05-01", "2026-05-02", "2026-05-03"],
    actualDayKeys: new Set(["2026-04-29", "2026-05-03"]),
    leftGutter: 42,
    innerWidth: 452,
    setCountsByDay: new Map([
      ["2026-04-29", 2],
      ["2026-05-03", 4],
    ]),
    changeCountsByDay: new Map(),
  });

  const earlyBand = layout.bandByDayKey.get("2026-04-29");
  const lateBand = layout.bandByDayKey.get("2026-05-03");
  assert.ok(earlyBand);
  assert.ok(lateBand);

  const earlyPositions = [0, 1].map((pointIndex) => resolveHistorySetSlotX({
    band: earlyBand,
    baseX: earlyBand!.centerX,
    daySlotWidth: earlyBand!.width,
    pointIndex,
    pointsInDay: 2,
  }));
  const latePositions = [0, 1, 2, 3].map((pointIndex) => resolveHistorySetSlotX({
    band: lateBand,
    baseX: lateBand!.centerX,
    daySlotWidth: lateBand!.width,
    pointIndex,
    pointsInDay: 4,
  }));

  assert.ok(earlyPositions[0]! < earlyPositions[1]!);
  assert.ok(earlyPositions[1]! < latePositions[0]!);
  assert.ok(latePositions[0]! < latePositions[1]!);
  assert.ok(latePositions[1]! < latePositions[2]!);
  assert.ok(latePositions[2]! < latePositions[3]!);
  assert.ok(
    (latePositions[3]! - latePositions[0]!) > (earlyPositions[1]! - earlyPositions[0]!),
  );
});

test("buildHistoryValueGridTicks uses actual weight tiers for weight graphs", () => {
  assert.deepEqual(
    buildHistoryValueGridTicks({
      metricKey: "weight",
      numericValues: [225, 245, 235, 225, 215],
    }),
    [245, 235, 225, 215],
  );
});

test("resolveHistorySetPlotY lifts higher-rep weight sets within the same weight band", () => {
  const primaryLevelsDesc = [245, 235, 225, 215];
  const lowRepY = resolveHistorySetPlotY({
    metricKey: "weight",
    maxSecondaryReps: 6,
    minValue: 210,
    primaryLevelsDesc,
    primaryValue: 225,
    secondaryReps: 2,
    setLaneHeight: 220,
    setLaneTop: 16,
    valueRange: 40,
  });
  const highRepY = resolveHistorySetPlotY({
    metricKey: "weight",
    maxSecondaryReps: 6,
    minValue: 210,
    primaryLevelsDesc,
    primaryValue: 225,
    secondaryReps: 6,
    setLaneHeight: 220,
    setLaneTop: 16,
    valueRange: 40,
  });
  const heavierWeightBaseY = resolveHistorySetPlotY({
    metricKey: "weight",
    maxSecondaryReps: 6,
    minValue: 210,
    primaryLevelsDesc,
    primaryValue: 235,
    secondaryReps: 1,
    setLaneHeight: 220,
    setLaneTop: 16,
    valueRange: 40,
  });

  assert.ok(highRepY < lowRepY);
  assert.ok(highRepY > heavierWeightBaseY);
  assert.ok((lowRepY - highRepY) >= 10);
});

test("resolveHistorySetPlotY still separates reps when every logged set uses the same weight", () => {
  const lowRepY = resolveHistorySetPlotY({
    metricKey: "weight",
    maxSecondaryReps: 8,
    minValue: 220,
    primaryLevelsDesc: [225],
    primaryValue: 225,
    secondaryReps: 3,
    setLaneHeight: 220,
    setLaneTop: 16,
    valueRange: 10,
  });
  const highRepY = resolveHistorySetPlotY({
    metricKey: "weight",
    maxSecondaryReps: 8,
    minValue: 220,
    primaryLevelsDesc: [225],
    primaryValue: 225,
    secondaryReps: 8,
    setLaneHeight: 220,
    setLaneTop: 16,
    valueRange: 10,
  });

  assert.ok(highRepY < lowRepY);
  assert.ok((lowRepY - highRepY) >= 10);
});
