"use client";

import { useEffect, useState } from "react";

type ExerciseAssetImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
};

const DEFAULT_FALLBACK_SRC = "/exercises/icons/_placeholder.svg";
// Session-scoped cache prevents repeated network retries for known-missing icon URLs.
const missingSrcCache = new Set<string>();

export function ExerciseAssetImage({ src, alt, className, fallbackSrc = DEFAULT_FALLBACK_SRC }: ExerciseAssetImageProps) {
  const [renderSrc, setRenderSrc] = useState(() => (missingSrcCache.has(src) && src !== fallbackSrc ? fallbackSrc : src));

  useEffect(() => {
    setRenderSrc(missingSrcCache.has(src) && src !== fallbackSrc ? fallbackSrc : src);
  }, [src, fallbackSrc]);

  return (
    <img
      src={renderSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (renderSrc !== fallbackSrc && src !== fallbackSrc) {
          missingSrcCache.add(src);
          setRenderSrc(fallbackSrc);
        }
      }}
    />
  );
}
