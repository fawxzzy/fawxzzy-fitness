import { NextResponse } from "next/server.js";
import { withSessionExpiredJson } from "@/lib/api-auth-redirect";
import type { ActionResult } from "@/lib/action-result";
import type { RepeatWorkoutResult } from "@/lib/repeat-workout-loaders";

type RepeatSessionRequest = {
  sessionId?: string;
};

// POST body handling for `/api/sessions/repeat`, with the repeat action injected so it is testable without auth.
export async function handleRepeatWorkoutRequest(
  request: Request,
  repeat: (sessionId: string) => Promise<ActionResult<RepeatWorkoutResult>>,
): Promise<Response> {
  let payload: RepeatSessionRequest;

  try {
    payload = (await request.json()) as RepeatSessionRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }

  const sessionId = typeof payload?.sessionId === "string" ? payload.sessionId.trim() : "";
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Missing session id." }, { status: 400 });
  }

  return withSessionExpiredJson(async () => {
    const result = await repeat(sessionId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  });
}
