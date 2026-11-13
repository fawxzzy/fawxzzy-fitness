import { NextRequest, NextResponse } from "next/server";
import { devRouteUnavailableResponse } from "@/lib/dev-route-guard";
import {
  HISTORY_PREVIEW_COOKIE_NAME,
  isHistoryPreviewAllowedHost,
  isHistoryPreviewEnabledInEnv,
} from "@/lib/history-preview-config";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const unavailable = devRouteUnavailableResponse();
  if (unavailable) {
    return unavailable;
  }

  if (!isHistoryPreviewEnabledInEnv() || !isHistoryPreviewAllowedHost(request.nextUrl.host)) {
    return new NextResponse(null, { status: 404 });
  }

  const response = NextResponse.redirect(new URL("/dev/history-preview", request.url));
  response.cookies.delete(HISTORY_PREVIEW_COOKIE_NAME);
  return response;
}
