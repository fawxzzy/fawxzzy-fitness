import { NextResponse } from "next/server";
import { getExercisesWithStatsForExplicitUser } from "@/lib/exercises-browser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim() ?? "";

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing user id." }, { status: 400 });
  }

  const rows = await getExercisesWithStatsForExplicitUser(userId, supabaseAdmin());
  return NextResponse.json({ ok: true, rows });
}
