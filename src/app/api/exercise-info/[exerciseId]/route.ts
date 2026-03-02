import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getExerciseInfoPayload } from "@/lib/exercise-info";

export async function GET(
  _request: Request,
  { params }: { params: { exerciseId: string } },
) {
  const user = await requireUser();

  try {
    const payload = await getExerciseInfoPayload(user.id, params.exerciseId);
    if (!payload) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/exercise-info] failed to load", error);
    return NextResponse.json({ error: "Failed to load exercise info" }, { status: 500 });
  }
}
