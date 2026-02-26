export function slugifyExerciseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replaceAll("&", "and")
    .replaceAll("'", "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
