import { optionalEnv } from "@/lib/env";

const FITNESS_ZAC_EMAIL_ENV = "FITNESS_ZAC_EMAIL";
const FITNESS_ZAC_PASSWORD_ENV = "FITNESS_ZAC_PASSWORD";
const FITNESS_QA_EMAIL_ENV = "FITNESS_QA_EMAIL";
const FITNESS_QA_PASSWORD_ENV = "FITNESS_QA_PASSWORD";

export type LocalDevAutoLoginAccount = "zac" | "qa";

function normalizeEmail(value: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

function readConfiguredAccountCredentials(account: LocalDevAutoLoginAccount) {
  if (account === "qa") {
    const qaEmail = normalizeEmail(optionalEnv(FITNESS_QA_EMAIL_ENV));
    const qaPassword = optionalEnv(FITNESS_QA_PASSWORD_ENV);
    if (qaEmail && qaPassword) {
      return {
        email: qaEmail,
        password: qaPassword,
      };
    }

    return null;
  }

  const zacEmail = normalizeEmail(optionalEnv(FITNESS_ZAC_EMAIL_ENV));
  const zacPassword = optionalEnv(FITNESS_ZAC_PASSWORD_ENV);
  if (zacEmail && zacPassword) {
    return {
      email: zacEmail,
      password: zacPassword,
    };
  }

  return null;
}

export function readConfiguredLocalDevAutoLoginCredentials(preferredAccount?: LocalDevAutoLoginAccount | null) {
  if (preferredAccount) {
    return readConfiguredAccountCredentials(preferredAccount);
  }

  return readConfiguredAccountCredentials("zac") ?? readConfiguredAccountCredentials("qa");
}
