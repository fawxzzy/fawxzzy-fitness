import { handleRepeatWorkoutRequest } from "@/lib/repeat-workout-route-handler";
import { repeatWorkoutFromSession } from "@/lib/repeat-workout-server";

export const dynamic = "force-dynamic";

// History "Repeat workout": start a new session for the day a finished session came from (or open the live one).
export async function POST(request: Request) {
  return handleRepeatWorkoutRequest(request, repeatWorkoutFromSession);
}
