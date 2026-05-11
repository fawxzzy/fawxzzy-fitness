import { NextResponse } from "next/server.js";
import { clearSessionCookies, setSessionCookies } from "@/lib/auth-session";

type SessionSyncBody = {
  accessToken?: unknown;
  refreshToken?: unknown;
};

function buildResponse(body: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      ...(init?.headers ?? {}),
    },
  });
}

export async function POST(request: Request) {
  let body: SessionSyncBody | null = null;

  try {
    body = await request.json();
  } catch {
    return buildResponse({ ok: false, error: "Invalid session payload." }, { status: 400 });
  }

  const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken.trim() : "";

  if (!accessToken || !refreshToken) {
    return buildResponse({ ok: false, error: "Missing session tokens." }, { status: 400 });
  }

  const response = buildResponse({ ok: true });
  setSessionCookies(response.cookies, { accessToken, refreshToken });
  return response;
}

export async function DELETE() {
  const response = buildResponse({ ok: true });
  clearSessionCookies(response.cookies);
  return response;
}
