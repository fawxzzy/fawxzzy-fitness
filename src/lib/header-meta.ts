// Pure helpers for the plain-words header subtitle (DESIGN-CONTRACT.md section 15: at most one subtitle line).

/** The Add exercise screen subtitle: `<day> · <routine>`, skipping whichever part is missing or blank. */
export function formatAddExerciseSubtitle(dayLabel: string | null | undefined, routineName: string | null | undefined) {
  return [dayLabel, routineName]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" · ");
}

export function splitSessionHeaderTitle(input: string | null | undefined): { title: string; subtitle?: string } | null {
  const value = String(input ?? "").trim();
  if (!value) return null;

  const dividerMatch = value.match(/^(.+?)\s*[:\-–—|]\s*(.+)$/);
  if (!dividerMatch) {
    return { title: value };
  }

  const maybeTitle = dividerMatch[1]?.trim();
  const maybeSubtitle = dividerMatch[2]?.trim();
  if (!maybeTitle || !maybeSubtitle) {
    return { title: value };
  }

  return { title: maybeTitle, subtitle: maybeSubtitle };
}
