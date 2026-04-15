import { EXERCISE_ICON_EXT_BY_SLUG, EXERCISE_ICON_SLUGS } from "@/generated/exerciseIconManifest";

export type ExerciseImageSource = {
  slug?: string | null;
  name?: string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
};

export type ExerciseThumbSpec = {
  src: string;
  mode: "icon" | "photo" | "legacy-composite" | "fallback";
};

export type ExerciseCardThumbSource = ExerciseThumbSpec;

type ExerciseThumbInput = ExerciseImageSource & {
  cardIconSrc?: string | null;
  iconSrc?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
};

const PLACEHOLDER_ICON_SRC = "/exercises/icons/_placeholder.svg";
const HOWTO_PLACEHOLDER_PATHS = new Set(["/exercises/placeholders/howto.svg"]);
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

export function resolveExerciseThumb(exercise: ExerciseThumbInput): ExerciseThumbSpec {
  const explicitIconPath = getLocalImagePath(exercise.cardIconSrc)
    ?? getLocalImagePath(exercise.iconSrc)
    ?? getLocalImagePath(exercise.image_icon_path);
  if (explicitIconPath) {
    return { src: explicitIconPath, mode: "icon" };
  }

  const slugIconPath = getManifestIconPath(exercise.slug);
  if (slugIconPath) {
    return { src: slugIconPath, mode: "icon" };
  }

  const trimmedName = exercise.name?.trim();
  if (trimmedName) {
    const nameSlug = slugifyExerciseName(trimmedName);
    const nameIconPath = getManifestIconPath(nameSlug);
    if (nameIconPath) {
      return { src: nameIconPath, mode: "icon" };
    }
  }

  const thumbnailPath = getLocalImagePath(exercise.thumbnailUrl);
  if (thumbnailPath) {
    return { src: thumbnailPath, mode: "photo" };
  }

  const legacyImagePath = getLocalImagePath(exercise.imageUrl)
    ?? getLocalImagePath(exercise.image_path);
  if (legacyImagePath) {
    return { src: legacyImagePath, mode: "legacy-composite" };
  }

  return { src: PLACEHOLDER_ICON_SRC, mode: "fallback" };
}

export function resolveExerciseCardThumbSource(exercise: ExerciseImageSource): ExerciseCardThumbSource {
  return resolveExerciseThumb(exercise);
}

export function getExerciseIconSrc(exercise: ExerciseImageSource): string {
  return resolveExerciseThumb(exercise).src;
}

export function isPlaceholderExerciseIconSrc(src: string | null | undefined) {
  return typeof src === "string" && src === PLACEHOLDER_ICON_SRC;
}

export function getExerciseHowToImageSrc(exercise: ExerciseImageSource): string {
  const rawHowTo = exercise.image_howto_path?.trim() ?? "";
  if (rawHowTo.startsWith("/") && !HOWTO_PLACEHOLDER_PATHS.has(rawHowTo)) {
    return rawHowTo;
  }

  return getExerciseIconSrc(exercise);
}
