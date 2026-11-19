import "server-only";

import { headers, type UnsafeUnwrappedHeaders } from "next/headers";
import {
  isHistoryPreviewAllowedHost,
  isHistoryPreviewEnabledInEnv,
} from "@/lib/history-preview-config";

function getRequestHost() {
  const requestHeaders = (headers() as unknown as UnsafeUnwrappedHeaders);
  return requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
}

export function isHistoryPreviewAvailableForRequest() {
  return isHistoryPreviewEnabledInEnv() && isHistoryPreviewAllowedHost(getRequestHost());
}

export function isHistoryPreviewActiveForRequest() {
  return isHistoryPreviewAvailableForRequest();
}
