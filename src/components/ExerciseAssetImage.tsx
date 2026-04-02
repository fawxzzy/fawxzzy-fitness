"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type ExerciseAssetImageProps = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  fallbackSrc?: string;
  fallback?: ReactNode;
  sizes?: string;
  loading?: "eager" | "lazy";
};

const DEFAULT_FALLBACK_SRC = "/exercises/icons/_placeholder.svg";
const DEFAULT_SIZES = "(max-width: 768px) 40vw, 160px";
// Session-scoped cache prevents repeated retries for known-missing local asset paths.
const missingSrcCache = new Set<string>();

export function ExerciseAssetImage({
  src,
  alt,
  className,
  imageClassName,
  fallbackSrc = DEFAULT_FALLBACK_SRC,
  fallback,
  sizes = DEFAULT_SIZES,
  loading = "lazy",
}: ExerciseAssetImageProps) {
  const [renderSrc, setRenderSrc] = useState(() => (missingSrcCache.has(src) && src !== fallbackSrc ? fallbackSrc : src));
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    setRenderSrc(missingSrcCache.has(src) && src !== fallbackSrc ? fallbackSrc : src);
    setShowFallback(false);
  }, [src, fallbackSrc]);

  if (showFallback && fallback) {
    return <div className={cn("relative block shrink-0 overflow-hidden bg-transparent", className)}>{fallback}</div>;
  }

  return (
    <div className={cn("relative block shrink-0 overflow-hidden bg-transparent", className)}>
      <Image
        fill
        unoptimized
        src={renderSrc}
        alt={alt}
        loading={loading}
        sizes={sizes}
        className={cn("object-cover object-center", imageClassName)}
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
