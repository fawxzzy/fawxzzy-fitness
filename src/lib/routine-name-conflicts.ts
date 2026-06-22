function normalizeRoutineNameKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function hasRoutineNameConflict(args: {
  candidateName?: string | null;
  routineNames?: Array<string | null | undefined>;
  templateNames?: Array<string | null | undefined>;
}) {
  const normalizedCandidateName = normalizeRoutineNameKey(args.candidateName);
  if (!normalizedCandidateName) {
    return false;
  }

  return [...(args.routineNames ?? []), ...(args.templateNames ?? [])]
    .some((name) => normalizeRoutineNameKey(name) === normalizedCandidateName);
}
