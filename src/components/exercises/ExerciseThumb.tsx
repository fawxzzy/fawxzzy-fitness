"use client";

import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { cn } from "@/lib/cn";
import { resolveExerciseThumb, type ExerciseThumbIntent } from "@/lib/exerciseImages";

type ExerciseThumbProps = {
  exercise: {
    name?: string | null;
    slug?: string | null;
    image_path?: string | null;
    image_icon_path?: string | null;
    image_howto_path?: string | null;
  };
  alt?: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  size?: number;
  intent?: ExerciseThumbIntent;
};

function ThumbFallback() {
  return (
    <div className="grid h-full w-full place-items-center rounded-md border border-dashed border-white/10 bg-transparent text-[rgb(var(--text)/0.42)]">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-7 w-7"
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
  intent = "default",
}: ExerciseThumbProps) {
  const thumb = resolveExerciseThumb(exercise, { intent });

  if (thumb.mode === "fallback") {
    return (
      <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
        <ThumbFallback />
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <ExerciseAssetImage
        src={thumb.src}
        alt={alt ?? ""}
        className="h-full w-full rounded-md border border-white/10 bg-black/20"
        imageClassName={cn(
          thumb.mode === "icon"
            ? "object-contain object-center p-1.5"
            : thumb.mode === "legacy-composite"
              ? "origin-top scale-[1.08] object-cover object-top"
              : "object-cover object-center",
          imageClassName,
        )}
        sizes={sizes ?? `${size}px`}
        fallback={<ThumbFallback />}
      />
    </div>
  );
}
