import { NextRequest, NextResponse } from "next/server";
import {
  HISTORY_PREVIEW_COOKIE_NAME,
  isHistoryPreviewAllowedHost,
  isHistoryPreviewEnabledInEnv,
} from "@/lib/history-preview-fixtures";

export function GET(request: NextRequest) {
  if (!isHistoryPreviewEnabledInEnv() || !isHistoryPreviewAllowedHost(request.nextUrl.host)) {
    return new NextResponse(null, { status: 404 });
  }

  const response = NextResponse.redirect(new URL("/dev/history-preview", request.url));
  response.cookies.delete(HISTORY_PREVIEW_COOKIE_NAME);
  return response;
}
