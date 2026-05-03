export const CLIENT_BUNDLE_RECOVERY_STORAGE_KEY = "fawxzzy:bundle-recovery:last-attempt";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function getStorage(storage?: StorageLike | null) {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
}

export function getStaleClientAssetSignature(error: unknown) {
  const message = normalizeErrorMessage(error).toLowerCase();

  if (!message) {
    return null;
  }

  if (message.includes("chunkloaderror")) {
    return "chunk-load-error";
  }

  if (
    message.includes("failed to fetch dynamically imported module")
    || message.includes("importing a module script failed")
  ) {
    return "dynamic-import-failed";
  }

  if (
    message.includes("_next/static")
    && (
      message.includes("failed to fetch")
      || message.includes("loading css chunk")
      || message.includes("loading chunk")
      || message.includes("script error")
    )
  ) {
    return "next-static-asset-failed";
  }

  return null;
}

export function buildClientBundleRecoveryMarker(buildId: string, signature: string) {
  return `${buildId}:${signature}`;
}

export function shouldAttemptClientBundleRecovery(
  storage: StorageLike | null | undefined,
  buildId: string,
  signature: string,
) {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) {
    return true;
  }

  try {
    return resolvedStorage.getItem(CLIENT_BUNDLE_RECOVERY_STORAGE_KEY) !== buildClientBundleRecoveryMarker(buildId, signature);
  } catch {
    return true;
  }
}

export function markClientBundleRecoveryAttempt(
  storage: StorageLike | null | undefined,
  buildId: string,
  signature: string,
) {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  try {
    resolvedStorage.setItem(
      CLIENT_BUNDLE_RECOVERY_STORAGE_KEY,
      buildClientBundleRecoveryMarker(buildId, signature),
    );
  } catch {
    // Ignore storage failures and continue with the reload.
  }
}

export function buildClientBundleRecoveryHref(currentHref: string, buildId: string, signature: string) {
  const url = new URL(currentHref);
  url.searchParams.set("app-recovery", signature);
  url.searchParams.set("app-build", buildId);
  return url.toString();
}
