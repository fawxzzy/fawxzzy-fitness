import type { TodayRecoveryShadowPlacement } from "@/lib/ecosystem/fitness-shadow-placement-model";

type TodayRecoveryShadowPlacementLogger = (message: string, details: Record<string, unknown>) => void;
type TodayRecoveryShadowPlacementLoader = (input: {
  memberId: string;
  now?: Date | string;
}) => Promise<TodayRecoveryShadowPlacement | null>;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function loadTodayRecoveryShadowPlacementSafely(input: {
  memberId: string;
  now?: Date | string;
  loadPlacement: TodayRecoveryShadowPlacementLoader;
  logError?: TodayRecoveryShadowPlacementLogger;
}): Promise<TodayRecoveryShadowPlacement | null> {
  const logError = input.logError ?? ((message: string, details: Record<string, unknown>) => {
    console.error(message, details);
  });

  try {
    return await input.loadPlacement({
      memberId: input.memberId,
      now: input.now,
    });
  } catch (error) {
    logError("[today] recovery shadow placement failed", {
      memberId: input.memberId,
      error: toErrorMessage(error),
    });
    return null;
  }
}
