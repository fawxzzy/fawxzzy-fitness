import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDefaultPromotionDirectionFieldMap,
  buildPromotionDirectionFieldMap,
  buildPromotionGroupedDirectionFieldMap,
  normalizePromotionDirectionMap,
  normalizePromotionGroupedDirectionMap,
  serializePromotionDirectionFieldMap,
  serializePromotionGroupedDirectionFieldMap,
} from "./promotion-directions";

test("buildDefaultPromotionDirectionFieldMap defaults time/distance/reps/weight to up and omits calories", () => {
  // calories has no meaningful "up/down/straight" promotion direction in the
  // product today -- this locks in the current 4-key default so a future
  // change to add/remove a key is a deliberate, reviewed decision.
  assert.deepEqual(buildDefaultPromotionDirectionFieldMap(), {
    time: "up",
    distance: "up",
    reps: "up",
    weight: "up",
  });
});

test("buildDefaultPromotionDirectionFieldMap returns a fresh object each call", () => {
  const first = buildDefaultPromotionDirectionFieldMap();
  const second = buildDefaultPromotionDirectionFieldMap();
  assert.notEqual(first, second);
  first.time = "down";
  assert.equal(second.time, "up");
});

test("normalizePromotionDirectionMap keeps only valid direction values for known keys", () => {
  const result = normalizePromotionDirectionMap({
    time: "up",
    distance: "sideways",
    reps: "down",
    weight: undefined,
    calories: "straight",
    unknownKey: "up",
  });

  assert.deepEqual(result, { time: "up", reps: "down", calories: "straight" });
});

test("normalizePromotionDirectionMap returns undefined for non-object input", () => {
  assert.equal(normalizePromotionDirectionMap(null), undefined);
  assert.equal(normalizePromotionDirectionMap(undefined), undefined);
  assert.equal(normalizePromotionDirectionMap("up"), undefined);
  assert.equal(normalizePromotionDirectionMap(42), undefined);
});

test("normalizePromotionDirectionMap returns undefined when no key has a valid value", () => {
  assert.equal(normalizePromotionDirectionMap({}), undefined);
  assert.equal(normalizePromotionDirectionMap({ time: "sideways", unknownKey: "up" }), undefined);
});

test("buildPromotionDirectionFieldMap overlays valid saved directions onto the default map", () => {
  const result = buildPromotionDirectionFieldMap({ weight: "down", reps: "straight" });
  assert.deepEqual(result, { time: "up", distance: "up", reps: "straight", weight: "down" });
});

test("buildPromotionDirectionFieldMap ignores invalid saved direction values and keeps the default", () => {
  const result = buildPromotionDirectionFieldMap({ weight: "sideways" as never });
  assert.deepEqual(result, buildDefaultPromotionDirectionFieldMap());
});

test("buildPromotionDirectionFieldMap with no saved directions returns exactly the default map", () => {
  assert.deepEqual(buildPromotionDirectionFieldMap(undefined), buildDefaultPromotionDirectionFieldMap());
});

test("buildPromotionDirectionFieldMap can introduce the calories key via saved directions, even though the default omits it", () => {
  // The overlay loop iterates PROMOTION_DIRECTION_KEYS (all 5 keys,
  // including calories), not just the 4 keys buildDefaultPromotionDirectionFieldMap
  // seeds -- so a saved calories value IS carried through, unlike the
  // default map, which has no calories entry at all.
  const result = buildPromotionDirectionFieldMap({ calories: "down" } as never);
  assert.deepEqual(result, { time: "up", distance: "up", reps: "up", weight: "up", calories: "down" });
});

test("buildPromotionDirectionFieldMap with no saved calories value never introduces the key", () => {
  const result = buildPromotionDirectionFieldMap({ weight: "down" });
  assert.equal("calories" in result, false);
});

test("normalizePromotionGroupedDirectionMap keeps only entries with a valid direction and a non-blank key", () => {
  const result = normalizePromotionGroupedDirectionMap({
    "time+distance": "down",
    "weight+reps": "up",
    "": "up",
    "  ": "straight",
    invalid: "sideways",
  });

  assert.deepEqual(result, { "time+distance": "down", "weight+reps": "up" });
});

test("normalizePromotionGroupedDirectionMap returns undefined for non-object input or no valid entries", () => {
  assert.equal(normalizePromotionGroupedDirectionMap(null), undefined);
  assert.equal(normalizePromotionGroupedDirectionMap("up"), undefined);
  assert.equal(normalizePromotionGroupedDirectionMap({}), undefined);
  assert.equal(normalizePromotionGroupedDirectionMap({ key: "sideways" }), undefined);
});

test("buildPromotionGroupedDirectionFieldMap filters invalid values and blank keys, with no default seeding", () => {
  assert.deepEqual(
    buildPromotionGroupedDirectionFieldMap({ "a+b": "up", "  ": "down", "c+d": "sideways" as never }),
    { "a+b": "up" },
  );
  // Unlike buildPromotionDirectionFieldMap, this has no fixed key set to
  // default onto -- an empty/undefined input yields an empty map, not a
  // pre-seeded one.
  assert.deepEqual(buildPromotionGroupedDirectionFieldMap(undefined), {});
});

test("serializePromotionDirectionFieldMap keeps only known keys with a valid direction", () => {
  const result = serializePromotionDirectionFieldMap({
    time: "up",
    distance: "down",
    reps: "sideways" as never,
    weight: undefined,
  });
  assert.deepEqual(result, { time: "up", distance: "down" });
});

test("serializePromotionDirectionFieldMap returns undefined when nothing serializes", () => {
  assert.equal(serializePromotionDirectionFieldMap({}), undefined);
});

test("serializePromotionGroupedDirectionFieldMap round-trips a value built by buildPromotionGroupedDirectionFieldMap", () => {
  const built = buildPromotionGroupedDirectionFieldMap({ "a+b": "up", "c+d": "down" });
  const serialized = serializePromotionGroupedDirectionFieldMap(built);
  assert.deepEqual(serialized, { "a+b": "up", "c+d": "down" });
});

test("serializePromotionGroupedDirectionFieldMap drops blank keys and invalid values, returns undefined when empty", () => {
  assert.deepEqual(
    serializePromotionGroupedDirectionFieldMap({ "a+b": "up", "  ": "down", "c+d": "sideways" as never }),
    { "a+b": "up" },
  );
  assert.equal(serializePromotionGroupedDirectionFieldMap({}), undefined);
});
