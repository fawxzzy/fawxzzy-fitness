"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type ExerciseAssetImageProps = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  containerStyle?: CSSProperties;
  fit?: "contain" | "cover";
  preferNaturalAspectRatio?: boolean;
  fallbackSrc?: string;
  fallback?: ReactNode;
  sizes?: string;
  loading?: "eager" | "lazy";
  priority?: boolean;
};

const DEFAULT_FALLBACK_SRC = "/exercises/icons/_placeholder.svg";
const DEFAULT_SIZES = "(max-width: 768px) 40vw, 160px";
// Session-scoped cache prevents repeated retries for known-missing local asset paths.
const missingSrcCache = new Set<string>();

function resolveKnownMissingAssetSrc(src: string, fallbackSrc: string) {
  if (src.startsWith("/missing/") && src !== fallbackSrc) {
    missingSrcCache.add(src);
    return fallbackSrc;
  }

  return missingSrcCache.has(src) && src !== fallbackSrc ? fallbackSrc : src;
}

export function ExerciseAssetImage({
  src,
  alt,
  className,
  imageClassName,
  imageStyle,
  containerStyle,
  fit = "contain",
  preferNaturalAspectRatio = false,
  fallbackSrc = DEFAULT_FALLBACK_SRC,
  fallback,
  sizes = DEFAULT_SIZES,
  loading = "lazy",
  priority = false,
}: ExerciseAssetImageProps) {
  const [renderSrc, setRenderSrc] = useState(() => resolveKnownMissingAssetSrc(src, fallbackSrc));
  const [showFallback, setShowFallback] = useState(false);
  const [intrinsicAspectRatio, setIntrinsicAspectRatio] = useState<string | null>(null);

  useEffect(() => {
    setRenderSrc(resolveKnownMissingAssetSrc(src, fallbackSrc));
    setShowFallback(false);
    setIntrinsicAspectRatio(null);
  }, [src, fallbackSrc]);

  const resolvedContainerStyle = preferNaturalAspectRatio
    ? { ...containerStyle, aspectRatio: intrinsicAspectRatio ?? containerStyle?.aspectRatio ?? "1 / 1" }
    : containerStyle;

  if (showFallback && fallback) {
    return (
      <div
        className={cn("relative block shrink-0 overflow-hidden bg-transparent", className)}
        style={resolvedContainerStyle}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      className={cn("relative block shrink-0 overflow-hidden bg-transparent", className)}
      style={resolvedContainerStyle}
    >
      <Image
        fill
        unoptimized
        src={renderSrc}
        alt={alt}
        loading={priority ? undefined : loading}
        priority={priority}
        sizes={sizes}
        className={cn(fit === "cover" ? "object-cover object-center" : "object-contain object-center", imageClassName)}
        style={imageStyle}
        onLoad={(event) => {
          if (!preferNaturalAspectRatio) return;
          const image = event.currentTarget;
          if (image.naturalWidth > 0 && image.naturalHeight > 0) {
            setIntrinsicAspectRatio(`${image.naturalWidth} / ${image.naturalHeight}`);
          }
        }}
        onError={() => {
          if (renderSrc !== fallbackSrc && src !== fallbackSrc) {
            missingSrcCache.add(src);
            setRenderSrc(fallbackSrc);
            return;
          }
          setShowFallback(true);
        }}
      />
    </div>
  );
}
