"use client";

import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { cn } from "@/lib/cn";
import { resolveExerciseCardThumbSource } from "@/lib/exerciseImages";

type ExerciseThumbProps = {
  exercise: {
    name: string;
    slug?: string | null;
    image_path?: string | null;
    image_icon_path?: string | null;
    image_howto_path?: string | null;
  };
  alt?: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
};

function ThumbFallback() {
  return (
    <div className="grid h-full w-full place-items-center bg-white/5 text-[rgb(var(--text)/0.35)]">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6"
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
  sizes = "(max-width: 768px) 40vw, 160px",
}: ExerciseThumbProps) {
  const thumb = resolveExerciseCardThumbSource(exercise);

  if (thumb.mode === "placeholder") {
    return (
      <div className={cn("relative block shrink-0 overflow-hidden bg-transparent", "h-full w-full", className)}>
        <ThumbFallback />
      </div>
    );
  }

  return (
    <ExerciseAssetImage
      src={thumb.src}
      alt={alt ?? `${exercise.name} icon`}
      className={cn("h-full w-full", className)}
      imageClassName={cn(
        thumb.mode === "sprite"
          ? "object-cover object-top"
          : "object-contain object-center p-2",
        imageClassName,
      )}
      sizes={sizes}
      fallback={<ThumbFallback />}
    />
  );
}
