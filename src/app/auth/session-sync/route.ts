import { NextResponse } from "next/server";
import { clearSessionCookies, setSessionCookies } from "@/lib/auth-session";

type SessionSyncBody = {
  accessToken?: unknown;
  refreshToken?: unknown;
};

function buildResponse() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  let body: SessionSyncBody | null = null;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid session payload." }, { status: 400 });
  }

  const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken.trim() : "";

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ ok: false, error: "Missing session tokens." }, { status: 400 });
  }

  const response = buildResponse();
  setSessionCookies(response.cookies, { accessToken, refreshToken });
  return response;
}

export async function DELETE() {
  const response = buildResponse();
  clearSessionCookies(response.cookies);
  return response;
}
