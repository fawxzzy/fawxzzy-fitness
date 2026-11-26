/**
 * Plain-language copy for add-exercise failures. Database and schema errors are logged on the server and never
 * returned to the member, so a raw PostgREST/Postgres message can never reach the screen.
 */
export const ADD_EXERCISE_FAILED_MESSAGE = "We couldn't add this exercise. Please try again.";
export const CREATE_CUSTOM_EXERCISE_FAILED_MESSAGE = "We couldn't create this custom exercise. Please try again.";
export const EXERCISE_TIMER_UNAVAILABLE_MESSAGE = "Exercise timers aren't available yet. Turn the timer off and add the exercise.";

export function logAddExerciseFailure(context: string, error: { message?: string | null; code?: string | null } | null | undefined) {
  console.error(`[add-exercise] ${context}`, { code: error?.code ?? null, message: error?.message ?? null });
}
