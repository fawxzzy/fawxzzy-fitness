import { NextRequest, NextResponse } from "next/server";
import { devRouteUnavailableResponse } from "@/lib/dev-route-guard";
import {
  HISTORY_PREVIEW_COOKIE_NAME,
  normalizeHistoryPreviewTarget,
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

  const target = normalizeHistoryPreviewTarget(request.nextUrl.searchParams.get("target"));
  const response = NextResponse.redirect(new URL(target, request.url));

  response.cookies.set(HISTORY_PREVIEW_COOKIE_NAME, "enabled", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
  });

  return response;
}
