import {
  EXERCISE_CARD_SLUGS,
  EXERCISE_CARD_SRC_BY_SLUG,
  EXERCISE_ICON_EXT_BY_SLUG,
  EXERCISE_ICON_SLUGS,
} from "@/generated/exerciseIconManifest";

export type ExerciseThumbSourceKind =
  | "custom-upload"
  | "session-log"
  | "generated-thumb"
  | "catalog-thumbnail"
  | "legacy-image"
  | "manifest-icon"
  | "unknown";

export type ExerciseImageSource = {
  cardSrc?: string | null;
  slug?: string | null;
  name?: string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  thumbnailUrl?: string | null;
  thumbnailSource?: ExerciseThumbSourceKind | null;
};

export type ExerciseThumbSpec = {
  src: string;
  mode: "icon" | "photo" | "legacy-composite" | "fallback";
};

export type ExerciseThumbRailAsset = {
  src: string;
  mode: Exclude<ExerciseThumbSpec["mode"], "fallback">;
  fit: "cover" | "contain";
};

export type ExerciseThumbRailSpec =
  | {
    layout: "fallback";
    assets: [];
  }
  | {
    layout: "single" | "dual";
    assets: ExerciseThumbRailAsset[];
  };

export type ExerciseCardThumbSource = ExerciseThumbSpec;
export type ExerciseThumbIntent = "default" | "row-card";

type ExerciseThumbInput = ExerciseImageSource & {
  iconSrc?: string | null;
  imageUrl?: string | null;
};

type ResolveExerciseThumbOptions = {
  intent?: ExerciseThumbIntent;
};

const PLACEHOLDER_ICON_SRC = "/exercises/icons/_placeholder.svg";
const HOWTO_PLACEHOLDER_PATHS = new Set(["/exercises/placeholders/howto.svg"]);
const missingIconSlugLogCache = new Set<string>();
const TRUSTED_ROW_THUMB_SOURCES = new Set<ExerciseThumbSourceKind>([
  "custom-upload",
  "generated-thumb",
  "session-log",
]);

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

function getLocalHowToPath(pathValue?: string | null): string | null {
  const localPath = getLocalImagePath(pathValue);
  if (!localPath || HOWTO_PLACEHOLDER_PATHS.has(localPath)) {
    return null;
  }

  return localPath;
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

function getExerciseNameSlug(exercise: ExerciseThumbInput): string | null {
  const trimmedName = exercise.name?.trim();
  return trimmedName ? slugifyExerciseName(trimmedName) : null;
}

function getTrustedRowPhoto(exercise: ExerciseThumbInput): string | null {
  const thumbnailPath = getLocalImagePath(exercise.thumbnailUrl);
  if (!thumbnailPath) {
    return null;
  }

  return exercise.thumbnailSource && TRUSTED_ROW_THUMB_SOURCES.has(exercise.thumbnailSource)
    ? thumbnailPath
    : null;
}

function resolveManifestIconPath(exercise: ExerciseThumbInput): string | null {
  const slugIconPath = getManifestIconPath(exercise.slug);
  if (slugIconPath) {
    return slugIconPath;
  }

  const nameSlug = getExerciseNameSlug(exercise);
  return nameSlug ? getManifestIconPath(nameSlug) : null;
}

function getManifestCardPath(slug?: string | null): string | null {
  const normalizedSlug = slug?.trim();
  if (!normalizedSlug || !EXERCISE_CARD_SLUGS.has(normalizedSlug)) {
    return null;
  }

  return EXERCISE_CARD_SRC_BY_SLUG[normalizedSlug] ?? null;
}

function resolveManifestCardPath(exercise: ExerciseThumbInput): string | null {
  const slugCardPath = getManifestCardPath(exercise.slug);
  if (slugCardPath) {
    return slugCardPath;
  }

  const nameSlug = getExerciseNameSlug(exercise);
  return nameSlug ? getManifestCardPath(nameSlug) : null;
}

export function resolveExerciseThumb(
  exercise: ExerciseThumbInput,
  options: ResolveExerciseThumbOptions = {},
): ExerciseThumbSpec {
  const intent = options.intent ?? "default";
  const explicitCardPath = getLocalImagePath(exercise.cardSrc);
  const explicitIconPath = getLocalImagePath(exercise.iconSrc)
    ?? getLocalImagePath(exercise.image_icon_path);
  const thumbnailPath = getLocalImagePath(exercise.thumbnailUrl);
  const legacyImagePath = getLocalImagePath(exercise.imageUrl)
    ?? getLocalImagePath(exercise.image_path);
  const manifestCardPath = resolveManifestCardPath(exercise);
  const manifestIconPath = resolveManifestIconPath(exercise);
  const cardPath = explicitCardPath ?? manifestCardPath;
  const iconPath = explicitIconPath ?? manifestIconPath;
  const trustedRowPhoto = getTrustedRowPhoto(exercise);

  if (intent === "row-card") {
    if (cardPath) {
      return { src: cardPath, mode: "icon" };
    }

    if (trustedRowPhoto) {
      return { src: trustedRowPhoto, mode: "photo" };
    }

    if (iconPath) {
      return { src: iconPath, mode: "icon" };
    }

    if (legacyImagePath) {
      return { src: legacyImagePath, mode: "legacy-composite" };
    }

    return { src: PLACEHOLDER_ICON_SRC, mode: "fallback" };
  }

  if (iconPath) {
    return { src: iconPath, mode: "icon" };
  }

  if (thumbnailPath) {
    return { src: thumbnailPath, mode: "photo" };
  }

  if (legacyImagePath) {
    return { src: legacyImagePath, mode: "legacy-composite" };
  }

  return { src: PLACEHOLDER_ICON_SRC, mode: "fallback" };
}

function pushRailAsset(assets: ExerciseThumbRailAsset[], nextAsset: ExerciseThumbRailAsset | null) {
  if (!nextAsset || assets.some((asset) => asset.src === nextAsset.src)) {
    return;
  }

  assets.push(nextAsset);
}

function toRailAsset(args: {
  src: string | null;
  mode: Exclude<ExerciseThumbSpec["mode"], "fallback">;
  fit?: "cover" | "contain";
}): ExerciseThumbRailAsset | null {
  if (!args.src) {
    return null;
  }

  return {
    src: args.src,
    mode: args.mode,
    fit: args.fit ?? (args.mode === "icon" ? "contain" : "cover"),
  };
}

export function resolveExerciseThumbRailSpec(
  exercise: ExerciseThumbInput,
  options: ResolveExerciseThumbOptions = {},
): ExerciseThumbRailSpec {
  const intent = options.intent ?? "default";
  const primary = resolveExerciseThumb(exercise, options);

  if (primary.mode === "fallback") {
    return {
      layout: "fallback",
      assets: [],
    };
  }

  const explicitCardPath = getLocalImagePath(exercise.cardSrc);
  const explicitIconPath = getLocalImagePath(exercise.iconSrc)
    ?? getLocalImagePath(exercise.image_icon_path);
  const thumbnailPath = getLocalImagePath(exercise.thumbnailUrl);
  const trustedRowPhoto = getTrustedRowPhoto(exercise);
  const legacyImagePath = getLocalImagePath(exercise.imageUrl)
    ?? getLocalImagePath(exercise.image_path);
  const howToPath = getLocalHowToPath(exercise.image_howto_path);
  const manifestCardPath = resolveManifestCardPath(exercise);
  const manifestIconPath = resolveManifestIconPath(exercise);
  const cardPath = explicitCardPath ?? manifestCardPath;
  const iconPath = explicitIconPath ?? manifestIconPath;
  const assets: ExerciseThumbRailAsset[] = [];

  const primaryFit = primary.mode === "icon" && primary.src !== iconPath ? "cover" : undefined;
  pushRailAsset(assets, toRailAsset({
    src: primary.src,
    mode: primary.mode,
    fit: primaryFit,
  }));

  if (intent !== "row-card") {
    return {
      layout: "single",
      assets: assets.slice(0, 1),
    };
  }

  pushRailAsset(assets, toRailAsset({
    src: trustedRowPhoto,
    mode: "photo",
    fit: "cover",
  }));
  pushRailAsset(assets, toRailAsset({
    src: cardPath && cardPath !== primary.src ? cardPath : null,
    mode: "icon",
    fit: "cover",
  }));
  pushRailAsset(assets, toRailAsset({
    src: howToPath,
    mode: "legacy-composite",
    fit: "cover",
  }));
  pushRailAsset(assets, toRailAsset({
    src: iconPath,
    mode: "icon",
    fit: "contain",
  }));
  pushRailAsset(assets, toRailAsset({
    src: thumbnailPath,
    mode: "photo",
    fit: "cover",
  }));
  pushRailAsset(assets, toRailAsset({
    src: legacyImagePath,
    mode: "legacy-composite",
    fit: "cover",
  }));

  return {
    layout: assets.length > 1 ? "dual" : "single",
    assets: assets.slice(0, Math.min(assets.length, 2)),
  };
}

export function resolveExerciseCardThumbSource(exercise: ExerciseImageSource): ExerciseCardThumbSource {
  return resolveExerciseThumb(exercise, { intent: "row-card" });
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
