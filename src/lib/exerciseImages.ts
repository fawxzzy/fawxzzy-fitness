import { EXERCISE_ICON_EXT_BY_SLUG, EXERCISE_ICON_SLUGS } from "@/generated/exerciseIconManifest";

export type ExerciseImageSource = {
  slug?: string | null;
  name: string;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
};

const PLACEHOLDER_ICON_SRC = "/exercises/icons/_placeholder.svg";
const missingIconSlugLogCache = new Set<string>();

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

function getLocalImagePath(pathValue?: string | null): string | null {
  const trimmedPath = pathValue?.trim();
  return trimmedPath?.startsWith("/") ? trimmedPath : null;
}

function getManifestIconPath(slug?: string | null): string | null {
  const normalizedSlug = slug?.trim();
  if (!normalizedSlug) {
    return null;
  }

  if (!EXERCISE_ICON_SLUGS.has(normalizedSlug)) {
    if (process.env.NODE_ENV !== "production" && !missingIconSlugLogCache.has(normalizedSlug)) {
      missingIconSlugLogCache.add(normalizedSlug);
      console.warn(`Missing icon for slug: ${normalizedSlug}`);
    }

    return null;
  }

  const extension = EXERCISE_ICON_EXT_BY_SLUG[normalizedSlug];
  if (!extension) {
    return null;
  }

  return `/exercises/icons/${normalizedSlug}.${extension}`;
}

export function getExerciseIconSrc(exercise: ExerciseImageSource): string {
  const explicitPath = getLocalImagePath(exercise.image_path) ?? getLocalImagePath(exercise.image_icon_path);
  if (explicitPath) {
    return explicitPath;
  }

  const slugIconPath = getManifestIconPath(exercise.slug);
  if (slugIconPath) {
    return slugIconPath;
  }

  const nameSlug = slugifyExerciseName(exercise.name);
  const nameIconPath = getManifestIconPath(nameSlug);
  if (nameIconPath) {
    return nameIconPath;
  }

  return PLACEHOLDER_ICON_SRC;
}

export function getExerciseHowToImageSrc(exercise: ExerciseImageSource): string {
  return getLocalImagePath(exercise.image_howto_path) ?? getExerciseIconSrc(exercise);
}

export function getExerciseMusclesImageSrc(imagePath?: string | null): string {
  return getLocalImagePath(imagePath) ?? "/exercises/placeholders/muscles.svg";
}
