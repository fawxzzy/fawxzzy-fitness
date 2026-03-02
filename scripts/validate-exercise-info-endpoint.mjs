const baseUrl = process.env.EXERCISE_INFO_BASE_URL ?? "http://127.0.0.1:3000";
const authCookie = process.env.EXERCISE_INFO_AUTH_COOKIE ?? "";
const knownValidExerciseId = process.env.EXERCISE_INFO_VALID_ID ?? "";

const INVALID_ID = "not-a-uuid";
const RANDOM_UUID = "11111111-1111-4111-8111-111111111111";

async function request(path, cookie = "") {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: cookie ? { cookie } : {},
  });

  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertErrorEnvelope(result, expectedStatus) {
  assert(result.status === expectedStatus, `Expected ${expectedStatus}, got ${result.status}`);
  assert(result.body && result.body.ok === false, `Expected ok:false envelope, got ${JSON.stringify(result.body)}`);
  assert(typeof result.body.message === "string" && result.body.message.length > 0, "Expected stable error message");
}

async function main() {
  console.log(`[validate-exercise-info-endpoint] baseUrl=${baseUrl}`);

  const invalidId = await request(`/api/exercise-info/${INVALID_ID}`);
  assertErrorEnvelope(invalidId, 400);
  console.log("✓ invalid UUID => 400 ok:false");

  const unauthenticated = await request(`/api/exercise-info/${RANDOM_UUID}`);
  assertErrorEnvelope(unauthenticated, 401);
  console.log("✓ unauthenticated => 401 ok:false");

  if (!authCookie) {
    console.log("! skipped authenticated matrix checks (set EXERCISE_INFO_AUTH_COOKIE to validate 404/200)");
    return;
  }

  const missing = await request(`/api/exercise-info/${RANDOM_UUID}`, authCookie);
  assertErrorEnvelope(missing, 404);
  console.log("✓ missing/hidden UUID with auth => 404 ok:false");

  if (!knownValidExerciseId) {
    console.log("! skipped 200 check (set EXERCISE_INFO_VALID_ID for optional success validation)");
    return;
  }

  const success = await request(`/api/exercise-info/${knownValidExerciseId}`, authCookie);
  assert(success.status === 200, `Expected 200, got ${success.status}`);
  assert(success.body && success.body.ok === true, `Expected ok:true envelope, got ${JSON.stringify(success.body)}`);
  assert(success.body.payload, "Expected payload on success envelope");
  console.log("✓ known valid UUID with auth => 200 ok:true");
}

main().catch((error) => {
  console.error("[validate-exercise-info-endpoint] failed", error);
  process.exit(1);
});
