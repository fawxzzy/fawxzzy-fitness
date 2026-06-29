import "server-only";
import { headers } from "next/headers";
import { optionalEnv } from "@/lib/env";
import { isTrustedLocalDevHost } from "@/lib/supabase/local-dev-host";

const FITNESS_LOCAL_DEV_ENTRY_PATH_ENV = "FITNESS_LOCAL_DEV_ENTRY_PATH";
const FITNESS_ZAC_EMAIL_ENV = "FITNESS_ZAC_EMAIL";
const FITNESS_ZAC_PASSWORD_ENV = "FITNESS_ZAC_PASSWORD";
const FITNESS_QA_EMAIL_ENV = "FITNESS_QA_EMAIL";
const FITNESS_QA_PASSWORD_ENV = "FITNESS_QA_PASSWORD";
export type LocalDevAutoLoginAccount = "zac" | "qa";

function normalizeEmail(value: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

function getRequestHostname() {
  const requestHeaders = headers();
  const hostHeader = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "").trim().toLowerCase();
  return hostHeader.split(":")[0] ?? "";
}

export function isTrustedLocalDevHostname(hostname: string) {
  return isTrustedLocalDevHost(hostname);
}

export function isTrustedLocalDevRequest() {
  return isTrustedLocalDevHostname(getRequestHostname());
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

export function getLocalDevAutoLoginCredentials(preferredAccount?: LocalDevAutoLoginAccount | null) {
  if (!isTrustedLocalDevRequest()) {
    return null;
  }

  return readConfiguredLocalDevAutoLoginCredentials(preferredAccount);
}

export async function resolveLocalDevAutoEntryHref({
  supabase,
  userEmail,
  userId,
}: {
  supabase: {
    from(table: string): any;
  };
  userEmail: string | null;
  userId: string;
}) {
  if (!isTrustedLocalDevRequest()) {
    return null;
  }

  const configuredEntryPath = optionalEnv(FITNESS_LOCAL_DEV_ENTRY_PATH_ENV);
  if (configuredEntryPath?.startsWith("/")) {
    return configuredEntryPath;
  }

  const configuredCredentials = readConfiguredLocalDevAutoLoginCredentials();
  if (configuredCredentials && normalizeEmail(userEmail) !== configuredCredentials.email) {
    return null;
  }

  void supabase;
  void userId;
  return null;
}
