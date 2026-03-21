import { NextResponse } from "next/server";
import { startSessionForActiveRoutineDay, startSessionForRoutineDay } from "@/lib/start-session";

export const dynamic = "force-dynamic";

type StartSessionRequest = {
  selectedDayIndex?: number;
  routineId?: string;
  dayId?: string;
};

export async function POST(request: Request) {
  let payload: StartSessionRequest;

  try {
    payload = (await request.json()) as StartSessionRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }

  const result = payload.routineId && payload.dayId
    ? await startSessionForRoutineDay({ routineId: payload.routineId, dayId: payload.dayId })
    : await startSessionForActiveRoutineDay({ dayIndex: payload.selectedDayIndex });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
