"use client";

import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { cn } from "@/lib/cn";
import {
  resolveExerciseThumbRailSpec,
  resolveExerciseThumb,
  type ExerciseThumbIntent,
  type ExerciseThumbRailAsset,
  type ExerciseThumbSourceKind,
} from "@/lib/exerciseImages";

type ExerciseThumbProps = {
  exercise: {
    name?: string | null;
    cardSrc?: string | null;
    slug?: string | null;
    image_path?: string | null;
    image_icon_path?: string | null;
    image_howto_path?: string | null;
    thumbnailUrl?: string | null;
    thumbnailSource?: ExerciseThumbSourceKind | null;
  };
  alt?: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  size?: number;
  railWidth?: number;
  detailed?: boolean;
  layout?: "rail" | "inline";
  intent?: ExerciseThumbIntent;
};

function ThumbFallback({ glyphClassName }: { glyphClassName: string }) {
  return (
    <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.14),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(7,14,21,0.18))] text-[rgb(var(--text)/0.42)]">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={glyphClassName}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9.5h2.5v5H3z" />
        <path d="M18.5 9.5H21v5h-2.5z" />
        <path d="M7 8h1.75v8H7z" />
        <path d="M15.25 8H17v8h-1.75z" />
        <path d="M8.75 12h6.5" />
      </svg>
    </div>
  );
}

function RailAssetPanel({
  asset,
  alt,
  sizes,
  className,
}: {
  asset: ExerciseThumbRailAsset;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const usesCover = asset.fit === "cover";

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        "bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.14),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(10,18,28,0.2))]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,12,0.03),rgba(4,8,12,0.2))]" aria-hidden="true" />
      <ExerciseAssetImage
        src={asset.src}
        alt={alt}
        className="h-full w-full"
        imageClassName={cn(
          "absolute inset-0 h-full w-full object-center",
          usesCover ? "object-cover" : "object-contain p-[12%]",
        )}
        sizes={sizes}
        fit={asset.fit}
        fallback={<ThumbFallback glyphClassName="h-8 w-8" />}
      />
    </div>
  );
}

export function ExerciseThumb({
  exercise,
  alt,
  className,
  imageClassName,
  sizes,
  size = 56,
  detailed = false,
  railWidth,
  layout = "inline",
  intent = "default",
}: ExerciseThumbProps) {
  const resolvedRailWidth = railWidth ?? (detailed ? 76 : 72);
  const thumb = resolveExerciseThumb(exercise, { intent });
  const railSpec = resolveExerciseThumbRailSpec(exercise, { intent });
  const isRail = layout === "rail";
  const wrapperClassName = cn(
    isRail ? "relative h-full w-full self-stretch overflow-hidden rounded-l-[inherit]" : "relative shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/20",
    className,
  );
  const fallbackGlyphClassName = isRail
    ? detailed
      ? "h-9 w-9"
      : "h-8 w-8"
    : size <= 48
      ? "h-6 w-6"
      : "h-7 w-7";
  const hasRenderableAsset = thumb.mode !== "fallback" && thumb.src.trim().length > 0;

  if (!hasRenderableAsset) {
    return (
      <div
        className={wrapperClassName}
        style={isRail ? undefined : { width: size, height: size }}
      >
        <ThumbFallback glyphClassName={fallbackGlyphClassName} />
      </div>
    );
  }

  if (isRail) {
    if (railSpec.layout === "fallback" || railSpec.assets.length === 0) {
      return (
        <div className={wrapperClassName}>
          <ThumbFallback glyphClassName={fallbackGlyphClassName} />
        </div>
      );
    }

    if (railSpec.layout === "dual" && railSpec.assets.length > 1) {
      return (
        <div className={cn(wrapperClassName, "grid grid-rows-2 bg-[rgb(var(--surface-2-rgb)/0.92)]")}>
          <RailAssetPanel asset={railSpec.assets[0]} alt={alt ?? ""} sizes={sizes ?? `${resolvedRailWidth}px`} />
          <RailAssetPanel
            asset={railSpec.assets[1]}
            alt={alt ?? ""}
            sizes={sizes ?? `${resolvedRailWidth}px`}
            className="border-t border-[rgb(var(--accent-divider-rgb)/0.18)]"
          />
        </div>
      );
    }

    return (
      <div className={cn(wrapperClassName, "bg-[rgb(var(--surface-2-rgb)/0.92)]")}>
        <RailAssetPanel asset={railSpec.assets[0]} alt={alt ?? ""} sizes={sizes ?? `${resolvedRailWidth}px`} />
      </div>
    );
  }

  return (
    <div
      className={wrapperClassName}
      style={isRail ? undefined : { width: size, height: size }}
    >
      <div className="relative h-full w-full">
        <ExerciseAssetImage
          src={thumb.src}
          alt={alt ?? ""}
          className="h-full w-full"
          imageClassName={cn("absolute inset-0 h-full w-full object-contain object-center", imageClassName)}
          sizes={sizes ?? (isRail ? `${resolvedRailWidth}px` : `${size}px`)}
          fit="contain"
          fallback={<ThumbFallback glyphClassName={fallbackGlyphClassName} />}
        />
      </div>
    </div>
  );
}
