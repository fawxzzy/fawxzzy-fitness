import "server-only";
import { headers } from "next/headers";
import { optionalEnv } from "@/lib/env";
import {
  readConfiguredLocalDevAutoLoginCredentials,
  type LocalDevAutoLoginAccount,
} from "@/lib/local-dev-auto-login-credentials";
import { isTrustedLocalDevHost } from "@/lib/supabase/local-dev-host";

export { readConfiguredLocalDevAutoLoginCredentials, type LocalDevAutoLoginAccount };

const FITNESS_LOCAL_DEV_ENTRY_PATH_ENV = "FITNESS_LOCAL_DEV_ENTRY_PATH";

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
