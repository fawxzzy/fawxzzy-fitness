export type PostLoginDestination =
  | { kind: "home" }
  | { kind: "curated-intro" }
  | { kind: "curated-resume"; draftId: string };

export interface PostLoginContext {
  isFirstLogin: boolean;
  curatedEngineEnabled: boolean;
  hasCompletedCuratedIntake: boolean;
  hasExistingProgram: boolean;
  savedCuratedDraftId?: string | null;
}

function normalizeDraftId(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function resolvePostLoginDestination(ctx: PostLoginContext): PostLoginDestination {
  const savedCuratedDraftId = normalizeDraftId(ctx.savedCuratedDraftId);

  if (!ctx.curatedEngineEnabled) {
    return { kind: "home" };
  }

  if (savedCuratedDraftId) {
    return { kind: "curated-resume", draftId: savedCuratedDraftId };
  }

  if (ctx.isFirstLogin && !ctx.hasCompletedCuratedIntake && !ctx.hasExistingProgram) {
    return { kind: "curated-intro" };
  }

  return { kind: "home" };
}
