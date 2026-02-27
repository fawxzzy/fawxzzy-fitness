export type ExerciseImageSource = {
  slug?: string | null;
  name: string;
  image_icon_path?: string | null;
};

// Keep aliases minimal: only canonical slug mismatches against existing icon filenames.
const ICON_ALIASES: Record<string, string> = {
  "pull-up": "pullup",
};

function toPublicSrc(path: string): string {
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  return `/${path}`;
}

export function slugifyExerciseName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function applyIconAlias(slug: string): string {
  return ICON_ALIASES[slug] ?? slug;
}

export function getExerciseIconSrc(exercise: ExerciseImageSource): string {
  if (exercise.image_icon_path && exercise.image_icon_path.trim()) {
    return toPublicSrc(exercise.image_icon_path.trim());
  }

  const sourceSlug = exercise.slug?.trim() ? exercise.slug.trim() : slugifyExerciseName(exercise.name);
  const iconSlug = applyIconAlias(slugifyExerciseName(sourceSlug));

  return `/exercises/icons/${iconSlug}.png`;
}
