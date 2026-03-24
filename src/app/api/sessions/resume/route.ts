import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isSafeAppPath } from "@/lib/navigation-return";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ResumeSessionRequest = {
  sessionId?: string;
  returnTo?: string;
};

export async function POST(request: Request) {
  let payload: ResumeSessionRequest;

  try {
    payload = (await request.json()) as ResumeSessionRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }

  const sessionId = payload.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Missing session id." }, { status: 400 });
  }

  const user = await requireUser();
  const supabase = supabaseServer();
  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle();

  if (!session?.id) {
    return NextResponse.json({ ok: false, error: "No active session to resume." }, { status: 404 });
  }

  const returnTo = isSafeAppPath(payload.returnTo) ? payload.returnTo : null;
  const href = returnTo
    ? `/session/${session.id}?returnTo=${encodeURIComponent(returnTo)}`
    : `/session/${session.id}`;

  return NextResponse.json({ ok: true, data: { href } });
}
