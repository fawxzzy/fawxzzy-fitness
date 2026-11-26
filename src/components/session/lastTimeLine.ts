// The open logger's one "Last time" line (wave 2, SIMPLIFY #3, 2026-11-26). It replaces the Use last / Resync /
// Clear last button: one plain line that says what was lifted last time, and tapping it fills the fields with it.
//
// Input is the target hint's last summary ("225 lbs x 5", "225 lbs" or "5 reps", from session-target-hints.ts) and its
// short date ("Nov 19"). Output reads reps first, like the Log set button: "Last time: 5 × 225 lbs · Nov 19".

const WEIGHT_AND_REPS = /^(.+?)\s+x\s+(\d+(?:\.\d+)?)$/i;

export function formatLastTimeLine(summary: string | null | undefined, dateLabel: string | null | undefined): string | null {
  const trimmed = summary?.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(WEIGHT_AND_REPS);
  const body = match ? `${match[2]} × ${match[1].trim()}` : trimmed;
  const date = dateLabel?.trim();
  return date ? `Last time: ${body} · ${date}` : `Last time: ${body}`;
}
