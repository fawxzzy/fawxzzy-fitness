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

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function ExerciseIcon({ slug, size = 48, className }: ExerciseIconProps) {
  const spec = exerciseIconMap[slug] ?? fallbackSpec;
  const seedKey = `${slug}|${spec.kind}|${spec.equipment}|${spec.variant ?? ""}|${spec.grip ?? ""}|${spec.angle ?? ""}|${spec.stance ?? ""}|${spec.cablePath ?? ""}|${spec.unilateral ? "1" : "0"}`;
  const seed = hashString(seedKey);

  const armY = 21 + (seed % 6);
  const torsoX = 32 + ((seed >> 3) % 3) - 1;
  const chestY = (spec.angle === "incline" ? 27 : spec.angle === "decline" ? 33 : 30) + (((seed >> 4) % 3) - 1);
  const kneeX = (spec.stance === "wide" ? 24 : spec.stance === "narrow" ? 30 : 27) + (((seed >> 6) % 3) - 1);

  const barConfigByGrip = {
    wide: { left: 14, right: 50 },
    close: { left: 24, right: 40 },
    neutral: { left: 21, right: 43 },
    pronated: { left: 20, right: 44 },
    supinated: { left: 22, right: 42 },
    default: { left: 19, right: 45 },
  } as const;
  const handKey = spec.grip ?? "default";
  const handPositions = barConfigByGrip[handKey as keyof typeof barConfigByGrip] ?? barConfigByGrip.default;
  const barOverhang = spec.grip === "close" ? 6 : spec.grip === "wide" ? 10 : 8;
  const barLeftX = handPositions.left - barOverhang;
  const barRightX = handPositions.right + barOverhang;

  const unilateralRight = (seed & 1) === 1;
  const singleHandX = unilateralRight ? 43 : 21;
  const leftArmX = spec.unilateral ? (unilateralRight ? 24 : 21) : 22;
  const rightArmX = spec.unilateral ? (unilateralRight ? 43 : 40) : 42;

  const cableTargetX = spec.unilateral ? singleHandX : 42;
  const cableTargetY = spec.cablePath === "high_to_low" ? armY - 1 : spec.cablePath === "low_to_high" ? armY + 2 : armY;
  const cableStartY = spec.cablePath === "high_to_low" ? 14 : spec.cablePath === "low_to_high" ? 50 : 30;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-md border border-border bg-[rgb(var(--bg)/0.4)] ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width="100%" height="100%" className="h-full w-full">
        <g className="text-[rgb(var(--text))]" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx={torsoX} cy="12" r="4" />
          <path d={`M${torsoX} 16 L${torsoX} ${chestY}`} />
          <path d={`M${torsoX} 22 L${leftArmX} ${armY}`} />
          <path d={`M${torsoX} 22 L${rightArmX} ${armY}`} />
          <path d={`M${torsoX} ${chestY} L${kneeX} 46 L22 58`} />
          <path d={`M${torsoX} ${chestY} L${64 - kneeX} 46 L42 58`} />
        </g>

        <g className="text-accent" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {spec.equipment === "barbell" ? (
            <>
              <path d={`M${barLeftX} ${armY - 1} L${barRightX} ${armY - 1}`} />
              <path d={`M${barLeftX - 3} ${armY - 5} L${barLeftX - 3} ${armY + 3}`} />
              <path d={`M${barRightX + 3} ${armY - 5} L${barRightX + 3} ${armY + 3}`} />
              <path d={`M${barLeftX - 6} ${armY - 4} L${barLeftX - 6} ${armY + 2}`} />
              <path d={`M${barRightX + 6} ${armY - 4} L${barRightX + 6} ${armY + 2}`} />
            </>
          ) : null}

          {spec.equipment === "dumbbell" ? (
            spec.unilateral ? (
              <rect x={singleHandX - 4} y={armY - 3} width="8" height="5" rx="1" />
            ) : (
              <>
                <rect x="16" y={armY - 3} width="8" height="5" rx="1" />
                <rect x="40" y={armY - 3} width="8" height="5" rx="1" />
              </>
            )
          ) : null}

          {spec.equipment === "cable" ? (
            <>
              <path d="M52 10 L52 54 L58 54" />
              {spec.unilateral ? (
                <>
                  <path d={`M52 ${cableStartY} L${cableTargetX} ${cableTargetY}`} />
                  <circle cx={cableTargetX} cy={cableTargetY} r="1.5" fill="currentColor" />
                </>
              ) : (
                <>
                  <path d={spec.cablePath === "high_to_low" ? "M52 14 L42 24" : spec.cablePath === "low_to_high" ? "M52 50 L42 28" : "M52 30 L42 30"} />
                  <path d={spec.cablePath === "high_to_low" ? "M52 14 L22 24" : spec.cablePath === "low_to_high" ? "M52 50 L22 28" : "M52 30 L22 30"} />
                  <circle cx="42" cy={spec.cablePath === "high_to_low" ? 24 : spec.cablePath === "low_to_high" ? 28 : 30} r="1.5" fill="currentColor" />
                  <circle cx="22" cy={spec.cablePath === "high_to_low" ? 24 : spec.cablePath === "low_to_high" ? 28 : 30} r="1.5" fill="currentColor" />
                </>
              )}
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
            spec.kind === "cardio" && spec.variant?.includes("treadmill") ? (
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
            )
          ) : null}

          {spec.equipment === "bodyweight" && spec.kind === "core" ? <path d="M18 40 L46 40" /> : null}
        </g>
      </svg>
    </div>
  );
}
