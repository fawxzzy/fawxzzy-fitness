import "server-only";

import { cookies, headers } from "next/headers";
import {
  HISTORY_PREVIEW_COOKIE_NAME,
  isHistoryPreviewAllowedHost,
  isHistoryPreviewEnabledInEnv,
} from "@/lib/history-preview-fixtures";

function getRequestHost() {
  const requestHeaders = headers();
  return requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
}

export function isHistoryPreviewAvailableForRequest() {
  return isHistoryPreviewEnabledInEnv() && isHistoryPreviewAllowedHost(getRequestHost());
}

export function isHistoryPreviewActiveForRequest() {
  if (!isHistoryPreviewAvailableForRequest()) {
    return false;
  }

  return cookies().get(HISTORY_PREVIEW_COOKIE_NAME)?.value === "enabled";
}
