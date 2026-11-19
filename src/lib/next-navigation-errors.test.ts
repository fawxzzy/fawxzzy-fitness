import assert from "node:assert/strict";
import test from "node:test";
import { notFound, redirect } from "next/navigation.js";
import { isNotFoundError, isRedirectError } from "./next-navigation-errors.ts";

function caught(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("expected a throw");
}

// Pins the Next internals behind the helper: a framework upgrade that moves or renames them
// fails here instead of silently turning redirect()/notFound() into a 500 inside a try/catch.
test("redirect() is a redirect error and not a not-found error", () => {
  const error = caught(() => redirect("/login"));
  assert.equal(isRedirectError(error), true);
  assert.equal(isNotFoundError(error), false);
});

test("notFound() is a not-found error and not a redirect error", () => {
  const error = caught(() => notFound());
  assert.equal(isNotFoundError(error), true);
  assert.equal(isRedirectError(error), false);
});

test("ordinary errors and non-errors are neither", () => {
  for (const value of [new Error("boom"), null, undefined, "NEXT_REDIRECT", { digest: "NEXT_NOT_FOUND" }]) {
    assert.equal(isRedirectError(value), false);
    assert.equal(isNotFoundError(value), false);
  }
});
