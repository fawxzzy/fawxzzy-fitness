export const ROUTINE_COPY_NAME_MAX_LENGTH = 15;

const FALLBACK_ROUTINE_COPY_NAME = "Routine";

function normalizeRoutineCopyNameKey(value: string) {
  return value.trim().toLowerCase();
}

function normalizeRoutineCopyNameValue(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length === 0) {
    return "";
  }

  return normalized.slice(0, ROUTINE_COPY_NAME_MAX_LENGTH);
}

function buildSuffixedRoutineCopyName(baseName: string, copyNumber: number) {
  const suffix = ` ${copyNumber}`;
  const maxBaseLength = Math.max(1, ROUTINE_COPY_NAME_MAX_LENGTH - suffix.length);
  const trimmedBaseName = baseName.slice(0, maxBaseLength).trimEnd();
  const safeBaseName = trimmedBaseName.length > 0
    ? trimmedBaseName
    : FALLBACK_ROUTINE_COPY_NAME.slice(0, maxBaseLength).trimEnd();

  return `${safeBaseName}${suffix}`;
}

export function resolveUniqueRoutineCopyName(args: {
  sourceName?: string | null;
  requestedName?: string | null;
  existingNames: Array<string | null | undefined>;
}) {
  const normalizedRequestedName = normalizeRoutineCopyNameValue(args.requestedName ?? "");
  const normalizedSourceName = normalizeRoutineCopyNameValue(args.sourceName ?? "");
  const baseName = normalizedRequestedName || normalizedSourceName || FALLBACK_ROUTINE_COPY_NAME;
  const takenNames = new Set(
    args.existingNames
      .map((name) => normalizeRoutineCopyNameKey(normalizeRoutineCopyNameValue(name ?? "")))
      .filter((name) => name.length > 0),
  );

  if (!takenNames.has(normalizeRoutineCopyNameKey(baseName))) {
    return baseName;
  }

  for (let copyNumber = 2; copyNumber < 1000; copyNumber += 1) {
    const candidateName = buildSuffixedRoutineCopyName(baseName, copyNumber);
    if (!takenNames.has(normalizeRoutineCopyNameKey(candidateName))) {
      return candidateName;
    }
  }

  return buildSuffixedRoutineCopyName(baseName, takenNames.size + 2);
}
