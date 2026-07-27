interface ProfileActivationQuery {
  (args: {
    userId: string;
    routineId: string;
  }): Promise<{
    data: {
      id: string;
    } | null;
    error: {
      message?: string;
    } | null;
  }>;
}

export interface ActivateProfileResult {
  ok: true;
  profileId: string;
}

export type ActivateProfileFailure = {
  ok: false;
  error: string;
};

export async function activateProfileRoutineId(
  args: {
    executeProfileActivation: ProfileActivationQuery;
    userId: string;
    routineId: string;
  },
): Promise<ActivateProfileResult | ActivateProfileFailure> {
  const { data: activeRoutineData, error: activeRoutineError } = await args.executeProfileActivation({
    userId: args.userId,
    routineId: args.routineId,
  });

  if (activeRoutineError) {
    return { ok: false, error: activeRoutineError.message ?? "Unable to activate the curated routine." };
  }

  if (!activeRoutineData?.id) {
    return { ok: false, error: "The curated routine was not activated." };
  }

  return { ok: true, profileId: activeRoutineData.id };
}
