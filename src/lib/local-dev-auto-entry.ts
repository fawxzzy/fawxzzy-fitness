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

async function getRequestHostname() {
  const requestHeaders = await headers();
  const hostHeader = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "").trim().toLowerCase();
  return hostHeader.split(":")[0] ?? "";
}

export function isTrustedLocalDevHostname(hostname: string) {
  return isTrustedLocalDevHost(hostname);
}

// Async since Next 16 (request headers are async only). Always `await`: an un-awaited Promise is
// truthy and would read as a trusted local request.
export async function isTrustedLocalDevRequest() {
  return isTrustedLocalDevHostname(await getRequestHostname());
}

export async function getLocalDevAutoLoginCredentials(preferredAccount?: LocalDevAutoLoginAccount | null) {
  if (!(await isTrustedLocalDevRequest())) {
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
  if (!(await isTrustedLocalDevRequest())) {
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
