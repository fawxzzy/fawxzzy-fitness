import { NextRequest, NextResponse } from "next/server";
import {
  HISTORY_PREVIEW_COOKIE_NAME,
  normalizeHistoryPreviewTarget,
  isHistoryPreviewAllowedHost,
  isHistoryPreviewEnabledInEnv,
} from "@/lib/history-preview-fixtures";

export function GET(request: NextRequest) {
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
