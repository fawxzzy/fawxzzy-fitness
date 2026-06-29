import assert from "node:assert/strict";
import test from "node:test";

import { readConfiguredLocalDevAutoLoginCredentials } from "@/lib/local-dev-auto-login-credentials";

function withEnv<T>(overrides: Record<string, string | undefined>, run: () => T): T {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("local dev auto-login prefers Zac by default when both accounts exist", () => {
  const credentials = withEnv(
    {
      FITNESS_ZAC_EMAIL: "zac@example.com",
      FITNESS_ZAC_PASSWORD: "zac-secret",
      FITNESS_QA_EMAIL: "qa@example.com",
      FITNESS_QA_PASSWORD: "qa-secret",
    },
    () => readConfiguredLocalDevAutoLoginCredentials(),
  );

  assert.deepEqual(credentials, {
    email: "zac@example.com",
    password: "zac-secret",
  });
});

test("local dev auto-login can force the QA account when requested", () => {
  const credentials = withEnv(
    {
      FITNESS_ZAC_EMAIL: "zac@example.com",
      FITNESS_ZAC_PASSWORD: "zac-secret",
      FITNESS_QA_EMAIL: "atlas-fitness-qa-local@fawxzzy.test",
      FITNESS_QA_PASSWORD: "qa-secret",
    },
    () => readConfiguredLocalDevAutoLoginCredentials("qa"),
  );

  assert.deepEqual(credentials, {
    email: "atlas-fitness-qa-local@fawxzzy.test",
    password: "qa-secret",
  });
});

test("local dev auto-login respects explicit account selection instead of silently falling back", () => {
  const credentials = withEnv(
    {
      FITNESS_ZAC_EMAIL: "zac@example.com",
      FITNESS_ZAC_PASSWORD: "zac-secret",
      FITNESS_QA_EMAIL: undefined,
      FITNESS_QA_PASSWORD: undefined,
    },
    () => readConfiguredLocalDevAutoLoginCredentials("qa"),
  );

  assert.equal(credentials, null);
});
