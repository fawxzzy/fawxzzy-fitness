"use client";

import { exerciseIconMap } from "@/lib/exercises/exerciseIconMap";
import type { IconSpec } from "@/lib/exercises/iconSpec";

type ExerciseIconProps = {
  slug: string;
  size?: number;
  className?: string;
};

const fallbackSpec: IconSpec = {
  kind: "machine_other",
  equipment: "machine",
  variant: "fallback",
  cablePath: "straight",
};

function hashVariant(variant: string | undefined) {
  if (!variant) return 0;
  return [...variant].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function ExerciseIcon({ slug, size = 48, className }: ExerciseIconProps) {
  const spec = exerciseIconMap[slug] ?? fallbackSpec;
  const seed = hashVariant(spec.variant);
  const armY = 22 + (seed % 4);
  const kneeX = spec.stance === "wide" ? 24 : spec.stance === "narrow" ? 30 : 27;
  const chestY = spec.angle === "incline" ? 27 : spec.angle === "decline" ? 33 : 30;

  return (
    <div
      className={`inline-flex h-12 w-12 items-center justify-center rounded-md border border-border bg-white/70 ${className ?? ""}`}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="h-full w-full">
        <g stroke="#111111" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="12" r="4" />
          <path d={`M32 16 L32 ${chestY}`} />
          <path d={`M32 22 L22 ${armY}`} />
          <path d={`M32 22 L42 ${armY}`} />
          <path d={`M32 ${chestY} L${kneeX} 46 L22 58`} />
          <path d={`M32 ${chestY} L${64 - kneeX} 46 L42 58`} />
        </g>

        <g stroke="#16a34a" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {spec.equipment === "barbell" ? (
            <>
              <path d={`M14 ${armY - 1} L50 ${armY - 1}`} />
              <path d={`M11 ${armY - 5} L11 ${armY + 3}`} />
              <path d={`M53 ${armY - 5} L53 ${armY + 3}`} />
              <path d={`M8 ${armY - 4} L8 ${armY + 2}`} />
              <path d={`M56 ${armY - 4} L56 ${armY + 2}`} />
            </>
          ) : null}
          {spec.equipment === "dumbbell" ? (
            <>
              <rect x="16" y={armY - 3} width="8" height="5" rx="1" />
              <rect x="40" y={armY - 3} width="8" height="5" rx="1" />
            </>
          ) : null}
          {spec.equipment === "cable" ? (
            <>
              <path d="M52 10 L52 54 L58 54" />
              <path d={spec.cablePath === "high_to_low" ? "M52 14 L42 24" : spec.cablePath === "low_to_high" ? "M52 50 L42 28" : "M52 30 L42 30"} />
              <circle cx="40" cy={spec.cablePath === "high_to_low" ? 24 : spec.cablePath === "low_to_high" ? 28 : 30} r="1.5" />
            </>
          ) : null}
          {spec.equipment === "machine" ? (
            <>
              <path d="M10 12 L10 56 L22 56" />
              <path d="M10 12 L24 12" />
              <path d="M20 36 L30 30" />
            </>
          ) : null}
          {spec.equipment === "cardio" ? (
            <>
              {spec.kind === "cardio" && spec.variant?.includes("treadmill") ? (
                <>
                  <path d="M12 48 L52 48" />
                  <path d="M44 20 L52 20 L52 40" />
                </>
              ) : (
                <>
                  <circle cx="20" cy="49" r="5" />
                  <circle cx="44" cy="49" r="5" />
                  <path d="M20 49 L32 34 L44 49" />
                </>
              )}
            </>
          ) : null}
          {spec.equipment === "bodyweight" && spec.kind === "core" ? <path d="M18 40 L46 40" /> : null}
        </g>

        {spec.unilateral ? <circle cx="20" cy="24" r="2" fill="#16a34a" /> : null}
        {spec.grip ? <path d={`M16 ${armY + 8} L48 ${armY + 8}`} stroke="#16a34a" strokeWidth="1.5" /> : null}
      </svg>
    </div>
  );
}
