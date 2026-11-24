import { NextResponse } from "next/server";
import { withSessionExpiredJson } from "@/lib/api-auth-redirect";
import { repeatWorkoutFromSession } from "@/lib/repeat-workout-server";

export const dynamic = "force-dynamic";

type RepeatSessionRequest = {
  sessionId?: string;
};

// History "Repeat workout": start a new session for the day a finished session came from (or open the live one).
export async function POST(request: Request) {
  let payload: RepeatSessionRequest;

  try {
    payload = (await request.json()) as RepeatSessionRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }

  const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Missing session id." }, { status: 400 });
  }

  return withSessionExpiredJson(async () => {
    const result = await repeatWorkoutFromSession(sessionId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  });
}
