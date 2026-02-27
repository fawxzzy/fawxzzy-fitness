"use client";

import { useEffect, useState } from "react";

type ExerciseAssetImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
};

const DEFAULT_FALLBACK_SRC = "/exercises/icons/_placeholder.svg";

export function ExerciseAssetImage({ src, alt, className, fallbackSrc = DEFAULT_FALLBACK_SRC }: ExerciseAssetImageProps) {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [src, fallbackSrc]);

  const resolvedSrc = errored ? fallbackSrc : src;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (resolvedSrc !== fallbackSrc) {
          setErrored(true);
        }
      }}
    />
  );
}
