import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  normalizeCuratedPlanningContract,
  sha256Hex,
} from "./planning-contract.ts";
import { createBeginnerPlanetFitness4DayMuscleGainFixture } from "./planning-fixtures.ts";

test("portable SHA-256 implementation matches the standard known vector", () => {
  assert.equal(
    sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  const unicodeValue = "Fawxzzy Fitness — deterministic 🏋️";
  assert.equal(
    sha256Hex(unicodeValue),
    createHash("sha256").update(unicodeValue, "utf8").digest("hex"),
  );
});

test("normalized planning contract captures exact fixture truth with a stable digest", () => {
  const first = normalizeCuratedPlanningContract(createBeginnerPlanetFitness4DayMuscleGainFixture());
  const second = normalizeCuratedPlanningContract(createBeginnerPlanetFitness4DayMuscleGainFixture({
    email: "another-fixture@example.com",
    name: "Another Fixture Name",
    mainGoals: ["consistency", "get-stronger", "build-muscle"],
    preferredTrainingDays: ["sun", "sat", "thu", "tue"],
    availableEquipment: [
      "bodyweight",
      "treadmill",
      "machines",
      "cables",
      "smith-machine",
      "dumbbells",
    ],
    movementsToImprove: ["squat", "bench-press"],
  }));

  assert.equal(first.status, "ready");
  assert.equal(first.safety.status, "ready");
  assert.equal(first.schedule.mode, "exact-weekdays");
  assert.deepEqual(first.schedule.preferredWeekdayIndexes, [2, 4, 6, 7]);
  assert.equal(first.schedule.weeklyMinutes, 180);
  assert.deepEqual(first.equipment.access, ["dumbbells", "machines", "bodyweight"]);
  assert.equal(first.equipment.access.includes("full-gym"), false);
  assert.equal(first.equipment.access.includes("barbell"), false);
  assert.equal(first.goals.ordered[0], "build-muscle");
  assert.ok(first.goals.movementsToImprove.includes("bench-press"));
  assert.ok(first.preferences.exerciseLikes.includes("dumbbell bench press"));
  assert.equal(first.provenance.digest.length, 64);
  assert.equal(first.provenance.digest, second.provenance.digest);
});

test("normalized planning contract fails closed on explicit safety and schedule ambiguity", () => {
  const contract = normalizeCuratedPlanningContract(createBeginnerPlanetFitness4DayMuscleGainFixture({
    under18: "yes",
    guardianPermission: "no",
    preferredTrainingDays: ["tue", "thu", "sat"],
    warningSymptoms: ["none", "dizziness"],
    medications: "prefer-not-to-say",
  }));

  assert.equal(contract.status, "blocked");
  assert.equal(contract.safety.status, "blocked");
  assert.ok(contract.blockerCodes.includes("guardian-authorization-required"));
  assert.ok(contract.blockerCodes.includes("preferred-weekday-count-mismatch"));
  assert.ok(contract.blockerCodes.includes("warning-symptoms-contradictory"));
  assert.ok(contract.blockerCodes.includes("warning-symptoms-require-clearance"));
  assert.ok(contract.blockerCodes.includes("medication-context-requires-review"));
});

test("normalized planning contract blocks partially populated intake without safety truth", () => {
  const data = createBeginnerPlanetFitness4DayMuscleGainFixture();
  data.intakeResponses = {
    trainingDaysPerWeek: "4",
    preferredTrainingDays: ["tue", "thu", "sat", "sun"],
  };

  const contract = normalizeCuratedPlanningContract(data);

  assert.equal(contract.status, "blocked");
  assert.ok(contract.blockerCodes.includes("safety-answers-incomplete"));
  assert.ok(contract.blockerCodes.includes("safety-acknowledgment-required"));
});
