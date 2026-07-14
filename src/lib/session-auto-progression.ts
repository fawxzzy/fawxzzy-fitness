export function shouldApplyAutomaticSessionPromotion(args: {
  candidateType: "promote" | "review" | "deload";
  autoUpdateRoutineGoals?: boolean;
  sourceSessionId?: string | null;
  completedSessionId: string;
}) {
  return args.candidateType === "promote"
    && args.autoUpdateRoutineGoals === true
    && Boolean(args.sourceSessionId)
    && args.sourceSessionId === args.completedSessionId;
}
