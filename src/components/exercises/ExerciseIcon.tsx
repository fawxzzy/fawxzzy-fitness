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

  const randomOffset = (bit: number, spread = 2) => (((seed >> bit) % (spread * 2 + 1)) - spread);
  const torsoX = 32 + randomOffset(2, 1);
  const headY = 11 + randomOffset(8, 1);
  const primaryLegX = (spec.stance === "wide" ? 24 : spec.stance === "narrow" ? 29 : 26) + randomOffset(10, 1);
  const secondaryLegX = 64 - primaryLegX + randomOffset(12, 1);
  const footY = 56 + randomOffset(14, 1);

  const poseByKind: Record<IconSpec["kind"], { shoulderY: number; hipY: number; torsoLean: number; armLift: number; leftKneeX: number; rightKneeX: number; footLeftX: number; footRightX: number; benchY?: number; groundY?: number }> = {
    squat: { shoulderY: 24 + randomOffset(4, 1), hipY: 35 + randomOffset(6, 1), torsoLean: 0, armLift: 1, leftKneeX: primaryLegX, rightKneeX: secondaryLegX, footLeftX: 21, footRightX: 43 },
    hinge: { shoulderY: 23, hipY: 35, torsoLean: 4, armLift: 3, leftKneeX: primaryLegX + 1, rightKneeX: secondaryLegX - 1, footLeftX: 22, footRightX: 42 },
    bench: { shoulderY: 34, hipY: 34, torsoLean: 10, armLift: 2, leftKneeX: 24, rightKneeX: 40, footLeftX: 18, footRightX: 46, benchY: 42 },
    overhead_press: { shoulderY: 21, hipY: 34, torsoLean: 0, armLift: -5, leftKneeX: primaryLegX, rightKneeX: secondaryLegX, footLeftX: 22, footRightX: 42 },
    row: { shoulderY: 24, hipY: 35, torsoLean: 5, armLift: 3, leftKneeX: primaryLegX + 1, rightKneeX: secondaryLegX - 1, footLeftX: 22, footRightX: 42 },
    pulldown: { shoulderY: 22, hipY: 34, torsoLean: 1, armLift: -6, leftKneeX: 25, rightKneeX: 39, footLeftX: 22, footRightX: 42 },
    curl: { shoulderY: 22, hipY: 34, torsoLean: 0, armLift: 0, leftKneeX: primaryLegX, rightKneeX: secondaryLegX, footLeftX: 22, footRightX: 42 },
    triceps: { shoulderY: 22, hipY: 34, torsoLean: 1, armLift: -1, leftKneeX: primaryLegX, rightKneeX: secondaryLegX, footLeftX: 22, footRightX: 42 },
    fly: { shoulderY: 24, hipY: 34, torsoLean: 2, armLift: -1, leftKneeX: 24, rightKneeX: 40, footLeftX: 20, footRightX: 44 },
    lunge: { shoulderY: 23, hipY: 35, torsoLean: 1, armLift: 0, leftKneeX: 23, rightKneeX: 41, footLeftX: 16, footRightX: 46 },
    hip_thrust: { shoulderY: 35, hipY: 35, torsoLean: 8, armLift: 2, leftKneeX: 25, rightKneeX: 39, footLeftX: 19, footRightX: 45, benchY: 41 },
    calf_raise: { shoulderY: 22, hipY: 34, torsoLean: 0, armLift: 0, leftKneeX: 27, rightKneeX: 37, footLeftX: 24, footRightX: 40 },
    core: { shoulderY: 35, hipY: 35, torsoLean: 8, armLift: 3, leftKneeX: 24, rightKneeX: 40, footLeftX: 18, footRightX: 46, groundY: 49 },
    cardio: { shoulderY: 23, hipY: 34, torsoLean: 2, armLift: 1, leftKneeX: 25, rightKneeX: 39, footLeftX: 20, footRightX: 43 },
    machine_other: { shoulderY: 23, hipY: 34, torsoLean: 0, armLift: 0, leftKneeX: 26, rightKneeX: 38, footLeftX: 22, footRightX: 42 },
  };

  const pose = poseByKind[spec.kind];
  const shoulderY = pose.shoulderY + randomOffset(16, 1);
  const hipY = pose.hipY + randomOffset(18, 1);
  const torsoTopX = torsoX + pose.torsoLean;
  const armY = shoulderY + pose.armLift + randomOffset(20, 1);
  const leftKneeX = pose.leftKneeX + randomOffset(22, 1);
  const rightKneeX = pose.rightKneeX + randomOffset(24, 1);
  const leftFootX = pose.footLeftX + randomOffset(26, 1);
  const rightFootX = pose.footRightX + randomOffset(28, 1);
  const benchY = pose.benchY ? pose.benchY + randomOffset(30, 1) : undefined;
  const groundY = pose.groundY ? pose.groundY + randomOffset(32, 1) : undefined;

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
  const cableTargetY = spec.cablePath === "high_to_low" ? armY - 2 : spec.cablePath === "low_to_high" ? armY + 2 : armY;
  const cableStartY = spec.cablePath === "high_to_low" ? 14 : spec.cablePath === "low_to_high" ? 50 : 28;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-md border border-border bg-[rgb(var(--bg)/0.4)] ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width="100%" height="100%" className="h-full w-full">
        <g className="text-[rgb(var(--text))]" stroke="currentColor" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx={torsoTopX} cy={headY} r="4" />
          <path d={`M${torsoTopX} ${headY + 5} Q${torsoTopX - 1} ${shoulderY} ${torsoX} ${hipY}`} />
          <path d={`M${torsoTopX - 1} ${shoulderY} Q${leftArmX} ${Math.round((shoulderY + armY) / 2)} ${leftArmX - 0.5} ${armY}`} />
          <path d={`M${torsoTopX + 1} ${shoulderY} Q${rightArmX} ${Math.round((shoulderY + armY) / 2)} ${rightArmX + 0.5} ${armY}`} />
          <path d={`M${torsoX} ${hipY} Q${leftKneeX} 46 ${leftFootX} ${footY}`} />
          <path d={`M${torsoX} ${hipY} Q${rightKneeX} 46 ${rightFootX} ${footY}`} />
          {groundY ? <path d={`M14 ${groundY} L50 ${groundY}`} /> : null}
          {benchY ? <path d={`M16 ${benchY} L48 ${benchY}`} /> : null}
        </g>

        <g className="text-accent" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {spec.equipment === "barbell" ? (
            <>
              <rect x={barLeftX} y={armY - 1.5} width={barRightX - barLeftX} height="3" rx="1.5" />
              <rect x={barLeftX - 6} y={armY - 4.5} width="4" height="9" rx="1.5" />
              <rect x={barLeftX - 11} y={armY - 4} width="4" height="8" rx="1.5" />
              <rect x={barRightX + 2} y={armY - 4.5} width="4" height="9" rx="1.5" />
              <rect x={barRightX + 7} y={armY - 4} width="4" height="8" rx="1.5" />
            </>
          ) : null}

          {spec.equipment === "dumbbell" ? (
            spec.unilateral ? (
              <>
                <rect x={singleHandX - 5} y={armY - 2} width="10" height="4" rx="1.5" />
                <rect x={singleHandX - 7} y={armY - 3.5} width="2" height="7" rx="1" />
                <rect x={singleHandX + 5} y={armY - 3.5} width="2" height="7" rx="1" />
              </>
            ) : (
              <>
                <rect x="15" y={armY - 2} width="10" height="4" rx="1.5" />
                <rect x="39" y={armY - 2} width="10" height="4" rx="1.5" />
                <rect x="13" y={armY - 3.5} width="2" height="7" rx="1" />
                <rect x="25" y={armY - 3.5} width="2" height="7" rx="1" />
                <rect x="37" y={armY - 3.5} width="2" height="7" rx="1" />
                <rect x="49" y={armY - 3.5} width="2" height="7" rx="1" />
              </>
            )
          ) : null}

          {spec.equipment === "cable" ? (
            <>
              <path d="M50 10 L50 54 L58 54" />
              <circle cx="50" cy="14" r="2" />
              {spec.unilateral ? (
                <>
                  <path d={`M50 ${cableStartY} L${cableTargetX} ${cableTargetY}`} />
                  <rect x={cableTargetX - 2} y={cableTargetY - 1.5} width="4" height="3" rx="1" fill="currentColor" />
                </>
              ) : (
                <>
                  <path d={spec.cablePath === "high_to_low" ? "M50 14 L42 24" : spec.cablePath === "low_to_high" ? "M50 50 L42 28" : "M50 28 L42 30"} />
                  <path d={spec.cablePath === "high_to_low" ? "M50 14 L22 24" : spec.cablePath === "low_to_high" ? "M50 50 L22 28" : "M50 28 L22 30"} />
                  <rect x="40" y={(spec.cablePath === "high_to_low" ? 24 : spec.cablePath === "low_to_high" ? 28 : 30) - 1.5} width="4" height="3" rx="1" fill="currentColor" />
                  <rect x="20" y={(spec.cablePath === "high_to_low" ? 24 : spec.cablePath === "low_to_high" ? 28 : 30) - 1.5} width="4" height="3" rx="1" fill="currentColor" />
                </>
              )}
            </>
          ) : null}

          {spec.equipment === "machine" ? (
            <>
              <rect x="8" y="12" width="3" height="44" rx="1.5" />
              <rect x="8" y="12" width="16" height="3" rx="1.5" />
              <path d="M20 38 L30 30" />
              <circle cx="20" cy="38" r="2" />
            </>
          ) : null}

          {spec.equipment === "cardio" ? (
            spec.kind === "cardio" && spec.variant?.includes("treadmill") ? (
              <>
                <path d="M12 47 L50 47" />
                <path d="M44 20 L52 20 L52 40" />
                <path d="M20 47 L28 37 L38 37" />
              </>
            ) : (
              <>
                <circle cx="20" cy="49" r="4.5" />
                <circle cx="44" cy="49" r="4.5" />
                <path d="M20 49 L32 35 L44 49" />
                <path d="M32 35 L39 35" />
              </>
            )
          ) : null}

          {spec.equipment === "bodyweight" && spec.kind === "core" ? <path d="M18 40 L46 40" /> : null}
        </g>
      </svg>
    </div>
  );
}
