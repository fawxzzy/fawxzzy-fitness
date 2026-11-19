import "server-only";

import { headers } from "next/headers";
import {
  isHistoryPreviewAllowedHost,
  isHistoryPreviewEnabledInEnv,
} from "@/lib/history-preview-config";

async function getRequestHost() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
}

// Async since Next 16 (request headers are async only). Always `await` these: an un-awaited
// Promise is truthy, so `if (isHistoryPreviewActiveForRequest())` would fail open.
// src/lib/async-request-helpers.contract.test.ts fails on any call site that is not awaited.
export async function isHistoryPreviewAvailableForRequest() {
  return isHistoryPreviewEnabledInEnv() && isHistoryPreviewAllowedHost(await getRequestHost());
}

export async function isHistoryPreviewActiveForRequest() {
  return await isHistoryPreviewAvailableForRequest();
}
