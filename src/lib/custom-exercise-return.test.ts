import test from "node:test";
import assert from "node:assert/strict";
import { appendQueryParams, buildCustomExerciseReturnTo } from "./custom-exercise-return";
import { isSafeAppPath } from "./navigation-return";

test("keeps the page's own query and drops one-shot feedback params", () => {
  assert.equal(buildCustomExerciseReturnTo("/routines/r1/edit/day/d1/add-exercise", ""), "/routines/r1/edit/day/d1/add-exercise");
  assert.equal(
    buildCustomExerciseReturnTo("/routines/r1/edit/day/d1/add-exercise", "?returnTo=%2Ftoday&dayId=d1"),
    "/routines/r1/edit/day/d1/add-exercise?returnTo=%2Ftoday&dayId=d1",
  );
  assert.equal(
    buildCustomExerciseReturnTo("/x", "?returnTo=%2Ftoday&success=Custom+exercise+renamed.&exerciseId=e1&error=nope"),
    "/x?returnTo=%2Ftoday",
  );
});

test("appends params with ? or & depending on the existing query", () => {
  assert.equal(appendQueryParams("/x", new URLSearchParams({ error: "a b" })), "/x?error=a+b");
  assert.equal(appendQueryParams("/x?returnTo=%2Ftoday", new URLSearchParams({ success: "ok" })), "/x?returnTo=%2Ftoday&success=ok");
  assert.equal(appendQueryParams("/x", new URLSearchParams()), "/x");
});

test("the rebuilt return path with a query is still a safe in-app path", () => {
  const path = buildCustomExerciseReturnTo("/routines/r1/edit/day/d1/add-exercise", "?returnTo=%2Ftoday&dayId=d1");
  assert.equal(isSafeAppPath(path), true);
});
