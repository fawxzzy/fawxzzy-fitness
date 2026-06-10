import "server-only";

import { headers } from "next/headers";
import {
  isHistoryPreviewAllowedHost,
  isHistoryPreviewEnabledInEnv,
} from "@/lib/history-preview-config";

function getRequestHost() {
  const requestHeaders = headers();
  return requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
}

export function isHistoryPreviewAvailableForRequest() {
  return isHistoryPreviewEnabledInEnv() && isHistoryPreviewAllowedHost(getRequestHost());
}

export function isHistoryPreviewActiveForRequest() {
  return isHistoryPreviewAvailableForRequest();
}
