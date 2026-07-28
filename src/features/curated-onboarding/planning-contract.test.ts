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
      "bench",
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

test("normalized planning contract rejects ambiguous or malformed safety answers", () => {
  const ambiguous = normalizeCuratedPlanningContract(
    createBeginnerPlanetFitness4DayMuscleGainFixture({
      hasPainOrLimitations: "other",
      hasPainOrLimitationsOther: "not sure",
      professionalRestrictions: "other",
      professionalRestrictionsOther: "not sure",
      warningSymptoms: ["other"],
      warningSymptomsOther: "not sure",
      medications: "other",
      medicationsOther: "not sure",
    }),
  );
  const malformed = normalizeCuratedPlanningContract(
    createBeginnerPlanetFitness4DayMuscleGainFixture({
      under18: [],
      warningSymptoms: "none",
    }),
  );

  assert.equal(ambiguous.status, "blocked");
  assert.equal(ambiguous.safety.status, "blocked");
  assert.ok(ambiguous.blockerCodes.includes("safety-answers-ambiguous"));
  assert.equal(malformed.status, "blocked");
  assert.ok(malformed.blockerCodes.includes("intake-answers-ambiguous"));
  assert.ok(malformed.blockerCodes.includes("safety-answers-ambiguous"));
  assert.ok(malformed.blockerCodes.includes("safety-answers-incomplete"));
});

test("normalized planning contract does not widen narrow equipment answers", () => {
  const contract = normalizeCuratedPlanningContract(
    createBeginnerPlanetFitness4DayMuscleGainFixture({
      availableEquipment: ["treadmill"],
    }),
  );

  assert.deepEqual(contract.equipment.available, ["treadmill"]);
  assert.equal(contract.equipment.access.includes("machines"), false);
  assert.equal(contract.equipment.access.length, 0);
});

test("normalized planning contract ignores caller-derived fields when questionnaire truth exists", () => {
  const data = createBeginnerPlanetFitness4DayMuscleGainFixture();
  data.trainingGoal = "get-stronger";
  data.experience = "advanced";
  data.daysPerWeek = 6;
  data.sessionLengthMinutes = 90;
  data.equipment = ["full-gym", "barbell"];

  const contract = normalizeCuratedPlanningContract(data);

  assert.equal(contract.goals.primary, "build-muscle");
  assert.equal(contract.experience.level, "beginner");
  assert.equal(contract.schedule.daysPerWeek, 4);
  assert.equal(contract.schedule.sessionLengthMinutes, 45);
  assert.equal(contract.equipment.access.includes("barbell"), false);
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
  assert.ok(contract.blockerCodes.includes("intake-answers-incomplete"));
  assert.ok(contract.blockerCodes.includes("safety-answers-incomplete"));
  assert.ok(contract.blockerCodes.includes("safety-acknowledgment-required"));
});
