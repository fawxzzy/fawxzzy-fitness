"use client";

import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { cn } from "@/lib/cn";
import {
  resolveExerciseThumb,
  type ExerciseThumbIntent,
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
    <div className="grid h-full w-full place-items-center bg-transparent text-[rgb(var(--text)/0.42)]">
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

export function ExerciseThumb({
  exercise,
  alt,
  className,
  imageClassName,
  sizes,
  size = 56,
  railWidth = detailed ? 76 : 72,
  detailed = false,
  layout = "inline",
  intent = "default",
}: ExerciseThumbProps) {
  const thumb = resolveExerciseThumb(exercise, { intent });
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
          sizes={sizes ?? (isRail ? `${railWidth}px` : `${size}px`)}
          fit="contain"
          fallback={<ThumbFallback glyphClassName={fallbackGlyphClassName} />}
        />
      </div>
    </div>
  );
}
