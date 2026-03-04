import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../src/lib/cardio-best.ts", import.meta.url), "utf8");

assert.match(source, /if \(!isExplicitCardio\) return "strength";/, "non-cardio measurement types must resolve to strength");
assert.match(source, /if \(duration <= 0 && distance > 0\)[\s\S]*kind: "distance"/, "distance-only cardio best should return distance");
assert.match(source, /if \(duration > 0 && distance > 0\)[\s\S]*kind: "pace"/, "duration+distance cardio best should return pace");
assert.match(source, /if \(duration > 0\)[\s\S]*kind: "duration"/, "duration-only cardio best should return duration");

console.log("cardio-best rules verified");
