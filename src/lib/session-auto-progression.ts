export function shouldApplyAutomaticSessionPromotion(args: {
  candidateType: "promote" | "review" | "deload";
  autoUpdateRoutineGoals?: boolean;
  sourceSessionRecordId?: string | null;
  completedSessionId: string;
}) {
  return args.candidateType === "promote"
    && args.autoUpdateRoutineGoals === true
    && Boolean(args.sourceSessionRecordId)
    && args.sourceSessionRecordId === args.completedSessionId;
}
