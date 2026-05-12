import type { ActionResult } from "@/lib/action-result";

type LiveSessionStatus = "in_progress" | "completed";

export type LiveSessionMutationSession = {
  id: string;
  userId: string;
  status: LiveSessionStatus;
};

export type LiveSessionMutationExercise = {
  id: string;
  sessionId: string;
  userId: string;
};

export type LiveSessionMutationRepository = {
  readSession(sessionId: string): Promise<LiveSessionMutationSession | null>;
  readSessionExercise(sessionExerciseId: string): Promise<LiveSessionMutationExercise | null>;
};

export type LiveSessionMutationContext = {
  userId: string;
  sessionId: string;
  sessionExerciseId?: string | null;
};

type LiveSessionMutationSuccess = {
  session: LiveSessionMutationSession;
  sessionExercise: LiveSessionMutationExercise | null;
};

const LIVE_SESSION_MUTATION_ERROR = "Can only edit the current active session.";
const LIVE_SESSION_EXERCISE_ERROR = "Exercise does not belong to the current active session.";

export async function guardLiveSessionMutation(
  repository: LiveSessionMutationRepository,
  context: LiveSessionMutationContext,
): Promise<ActionResult<LiveSessionMutationSuccess>> {
  const sessionId = context.sessionId.trim();
  const sessionExerciseId = context.sessionExerciseId?.trim() ?? "";

  if (!sessionId) {
    return { ok: false, error: LIVE_SESSION_MUTATION_ERROR };
  }

  const session = await repository.readSession(sessionId);
  if (!session || session.userId !== context.userId || session.status !== "in_progress") {
    return { ok: false, error: LIVE_SESSION_MUTATION_ERROR };
  }

  if (!sessionExerciseId) {
    return { ok: true, data: { session, sessionExercise: null } };
  }

  const sessionExercise = await repository.readSessionExercise(sessionExerciseId);
  if (!sessionExercise || sessionExercise.userId !== context.userId || sessionExercise.sessionId !== session.id) {
    return { ok: false, error: LIVE_SESSION_EXERCISE_ERROR };
  }

  return { ok: true, data: { session, sessionExercise } };
}
