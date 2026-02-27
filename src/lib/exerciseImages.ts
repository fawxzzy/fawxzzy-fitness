export type ExerciseImageSource = {
  slug?: string | null;
  name: string;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
};

function toPublicSrc(path: string): string {
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  return `/${path}`;
}

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

export function getExerciseIconSrc(exercise: ExerciseImageSource): string {
  if (exercise.image_icon_path && exercise.image_icon_path.trim()) {
    return toPublicSrc(exercise.image_icon_path.trim());
  }

  if (exercise.slug && exercise.slug.trim()) {
    return `/exercises/icons/${exercise.slug.trim()}.png`;
  }

  return `/exercises/icons/${slugifyExerciseName(exercise.name)}.png`;
}

export function getExerciseHowToSrc(exercise: ExerciseImageSource): string {
  if (exercise.image_howto_path && exercise.image_howto_path.trim()) {
    return toPublicSrc(exercise.image_howto_path.trim());
  }

  return getExerciseIconSrc(exercise);
}
