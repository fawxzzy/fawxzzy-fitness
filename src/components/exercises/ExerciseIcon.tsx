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

  const randomOffset = (bit: number, spread = 2) => ((seed >> bit) % (spread * 2 + 1)) - spread;
  const centerX = 32 + randomOffset(2, 1);
  const headY = 11 + randomOffset(6, 1);
  const stanceSpread = spec.stance === "wide" ? 13 : spec.stance === "narrow" ? 8 : 10;

  type Point = { x: number; y: number };
  type PosePreset = {
    shoulder: Point;
    hip: Point;
    leftElbow: Point;
    rightElbow: Point;
    leftHand: Point;
    rightHand: Point;
    leftKnee: Point;
    rightKnee: Point;
    leftFoot: Point;
    rightFoot: Point;
    benchY?: number;
    groundY?: number;
  };

  const poseByKind: Record<IconSpec["kind"], PosePreset> = {
    squat: { shoulder: { x: centerX, y: 22 }, hip: { x: centerX, y: 33 }, leftElbow: { x: centerX - 9, y: 26 }, rightElbow: { x: centerX + 9, y: 26 }, leftHand: { x: centerX - 12, y: 28 }, rightHand: { x: centerX + 12, y: 28 }, leftKnee: { x: centerX - 9, y: 45 }, rightKnee: { x: centerX + 9, y: 45 }, leftFoot: { x: centerX - 13, y: 55 }, rightFoot: { x: centerX + 13, y: 55 } },
    hinge: { shoulder: { x: centerX + 5, y: 24 }, hip: { x: centerX, y: 34 }, leftElbow: { x: centerX - 3, y: 29 }, rightElbow: { x: centerX + 6, y: 30 }, leftHand: { x: centerX, y: 35 }, rightHand: { x: centerX + 9, y: 35 }, leftKnee: { x: centerX - 6, y: 43 }, rightKnee: { x: centerX + 6, y: 43 }, leftFoot: { x: centerX - 10, y: 55 }, rightFoot: { x: centerX + 10, y: 55 } },
    row: { shoulder: { x: centerX + 5, y: 25 }, hip: { x: centerX, y: 35 }, leftElbow: { x: centerX + 1, y: 28 }, rightElbow: { x: centerX + 8, y: 28 }, leftHand: { x: centerX + 3, y: 31 }, rightHand: { x: centerX + 10, y: 31 }, leftKnee: { x: centerX - 7, y: 44 }, rightKnee: { x: centerX + 7, y: 44 }, leftFoot: { x: centerX - 11, y: 55 }, rightFoot: { x: centerX + 11, y: 55 } },
    bench: { shoulder: { x: centerX + (spec.angle === "incline" ? 5 : spec.angle === "decline" ? -4 : 1), y: 33 }, hip: { x: centerX - (spec.angle === "incline" ? 5 : spec.angle === "decline" ? -4 : 1), y: 36 }, leftElbow: { x: centerX - 8, y: 31 }, rightElbow: { x: centerX + 8, y: 31 }, leftHand: { x: centerX - 11, y: 27 }, rightHand: { x: centerX + 11, y: 27 }, leftKnee: { x: centerX - 6, y: 44 }, rightKnee: { x: centerX + 6, y: 44 }, leftFoot: { x: centerX - 12, y: 54 }, rightFoot: { x: centerX + 12, y: 54 }, benchY: 40 },
    pulldown: { shoulder: { x: centerX, y: 23 }, hip: { x: centerX, y: 34 }, leftElbow: { x: centerX - 8, y: 21 }, rightElbow: { x: centerX + 8, y: 21 }, leftHand: { x: centerX - 9, y: 18 }, rightHand: { x: centerX + 9, y: 18 }, leftKnee: { x: centerX - 6, y: 43 }, rightKnee: { x: centerX + 6, y: 43 }, leftFoot: { x: centerX - 9, y: 54 }, rightFoot: { x: centerX + 9, y: 54 } },
    lunge: { shoulder: { x: centerX + 1, y: 23 }, hip: { x: centerX, y: 34 }, leftElbow: { x: centerX - 7, y: 27 }, rightElbow: { x: centerX + 7, y: 27 }, leftHand: { x: centerX - 9, y: 30 }, rightHand: { x: centerX + 9, y: 30 }, leftKnee: { x: centerX - 10, y: 42 }, rightKnee: { x: centerX + 4, y: 45 }, leftFoot: { x: centerX - 15, y: 54 }, rightFoot: { x: centerX + 12, y: 54 } },
    hip_thrust: { shoulder: { x: centerX - 3, y: 35 }, hip: { x: centerX + 6, y: 35 }, leftElbow: { x: centerX - 8, y: 34 }, rightElbow: { x: centerX + 9, y: 34 }, leftHand: { x: centerX - 10, y: 34 }, rightHand: { x: centerX + 11, y: 34 }, leftKnee: { x: centerX, y: 43 }, rightKnee: { x: centerX + 12, y: 43 }, leftFoot: { x: centerX - 4, y: 54 }, rightFoot: { x: centerX + 15, y: 54 }, benchY: 38 },
    core: { shoulder: { x: centerX - 2, y: 34 }, hip: { x: centerX + 5, y: 36 }, leftElbow: { x: centerX - 8, y: 35 }, rightElbow: { x: centerX + 7, y: 35 }, leftHand: { x: centerX - 10, y: 36 }, rightHand: { x: centerX + 10, y: 36 }, leftKnee: { x: centerX - 1, y: 43 }, rightKnee: { x: centerX + 9, y: 43 }, leftFoot: { x: centerX - 4, y: 52 }, rightFoot: { x: centerX + 13, y: 52 }, groundY: 50 },
    cardio: { shoulder: { x: centerX + 2, y: 23 }, hip: { x: centerX, y: 34 }, leftElbow: { x: centerX - 5, y: 28 }, rightElbow: { x: centerX + 8, y: 27 }, leftHand: { x: centerX - 8, y: 30 }, rightHand: { x: centerX + 10, y: 30 }, leftKnee: { x: centerX - 5, y: 43 }, rightKnee: { x: centerX + 10, y: 41 }, leftFoot: { x: centerX - 10, y: 54 }, rightFoot: { x: centerX + 14, y: 52 }, groundY: 53 },
    overhead_press: { shoulder: { x: centerX, y: 23 }, hip: { x: centerX, y: 34 }, leftElbow: { x: centerX - 8, y: 20 }, rightElbow: { x: centerX + 8, y: 20 }, leftHand: { x: centerX - 9, y: 16 }, rightHand: { x: centerX + 9, y: 16 }, leftKnee: { x: centerX - 6, y: 43 }, rightKnee: { x: centerX + 6, y: 43 }, leftFoot: { x: centerX - 10, y: 55 }, rightFoot: { x: centerX + 10, y: 55 } },
    curl: { shoulder: { x: centerX, y: 23 }, hip: { x: centerX, y: 34 }, leftElbow: { x: centerX - 6, y: 29 }, rightElbow: { x: centerX + 6, y: 29 }, leftHand: { x: centerX - 4, y: 27 }, rightHand: { x: centerX + 4, y: 27 }, leftKnee: { x: centerX - 6, y: 43 }, rightKnee: { x: centerX + 6, y: 43 }, leftFoot: { x: centerX - 10, y: 55 }, rightFoot: { x: centerX + 10, y: 55 } },
    triceps: { shoulder: { x: centerX + 1, y: 23 }, hip: { x: centerX, y: 34 }, leftElbow: { x: centerX - 5, y: 26 }, rightElbow: { x: centerX + 7, y: 23 }, leftHand: { x: centerX - 5, y: 31 }, rightHand: { x: centerX + 9, y: 19 }, leftKnee: { x: centerX - 6, y: 43 }, rightKnee: { x: centerX + 6, y: 43 }, leftFoot: { x: centerX - 10, y: 55 }, rightFoot: { x: centerX + 10, y: 55 } },
    fly: { shoulder: { x: centerX, y: 25 }, hip: { x: centerX, y: 34 }, leftElbow: { x: centerX - 10, y: 26 }, rightElbow: { x: centerX + 10, y: 26 }, leftHand: { x: centerX - 13, y: 30 }, rightHand: { x: centerX + 13, y: 30 }, leftKnee: { x: centerX - 7, y: 43 }, rightKnee: { x: centerX + 7, y: 43 }, leftFoot: { x: centerX - 10, y: 55 }, rightFoot: { x: centerX + 10, y: 55 } },
    calf_raise: { shoulder: { x: centerX, y: 23 }, hip: { x: centerX, y: 34 }, leftElbow: { x: centerX - 7, y: 28 }, rightElbow: { x: centerX + 7, y: 28 }, leftHand: { x: centerX - 8, y: 31 }, rightHand: { x: centerX + 8, y: 31 }, leftKnee: { x: centerX - 4, y: 43 }, rightKnee: { x: centerX + 4, y: 43 }, leftFoot: { x: centerX - 8, y: 55 }, rightFoot: { x: centerX + 8, y: 55 } },
    machine_other: { shoulder: { x: centerX, y: 23 }, hip: { x: centerX, y: 34 }, leftElbow: { x: centerX - 7, y: 28 }, rightElbow: { x: centerX + 7, y: 28 }, leftHand: { x: centerX - 8, y: 31 }, rightHand: { x: centerX + 8, y: 31 }, leftKnee: { x: centerX - 6, y: 43 }, rightKnee: { x: centerX + 6, y: 43 }, leftFoot: { x: centerX - 10, y: 55 }, rightFoot: { x: centerX + 10, y: 55 } },
  };

  const pose = poseByKind[spec.kind];
  const jitter = {
    shoulderX: randomOffset(10, 1),
    shoulderY: randomOffset(12, 1),
    torsoLean: randomOffset(14, 1),
    elbow: randomOffset(16, 1),
    hand: randomOffset(18, 1),
    knee: randomOffset(20, 1),
    foot: randomOffset(22, 1),
  };

  const shoulder = { x: pose.shoulder.x + jitter.shoulderX, y: pose.shoulder.y + jitter.shoulderY };
  const hip = { x: pose.hip.x + jitter.torsoLean, y: pose.hip.y + randomOffset(24, 1) };
  const leftElbow = { x: pose.leftElbow.x - jitter.elbow, y: pose.leftElbow.y + randomOffset(26, 1) };
  const rightElbow = { x: pose.rightElbow.x + jitter.elbow, y: pose.rightElbow.y + randomOffset(28, 1) };
  const leftHand = { x: pose.leftHand.x - jitter.hand, y: pose.leftHand.y + randomOffset(30, 1) };
  const rightHand = { x: pose.rightHand.x + jitter.hand, y: pose.rightHand.y + randomOffset(32, 1) };
  const leftKnee = { x: pose.leftKnee.x - jitter.knee, y: pose.leftKnee.y + randomOffset(34, 1) };
  const rightKnee = { x: pose.rightKnee.x + jitter.knee, y: pose.rightKnee.y + randomOffset(36, 1) };
  const leftFoot = { x: pose.leftFoot.x - jitter.foot - Math.floor(stanceSpread / 7), y: pose.leftFoot.y + randomOffset(38, 1) };
  const rightFoot = { x: pose.rightFoot.x + jitter.foot + Math.floor(stanceSpread / 7), y: pose.rightFoot.y + randomOffset(40, 1) };
  const benchY = pose.benchY ? pose.benchY + randomOffset(42, 1) : undefined;
  const groundY = pose.groundY ? pose.groundY + randomOffset(44, 1) : undefined;

  const torsoTopY = headY + 6;
  const torsoCenterX = Math.round((shoulder.x + hip.x) / 2);
  const torsoCenterY = Math.round((torsoTopY + hip.y) / 2);
  const torsoHeight = Math.max(8, Math.abs(hip.y - torsoTopY));
  const torsoAngle = Math.atan2(hip.y - torsoTopY, hip.x - shoulder.x) * (180 / Math.PI);

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
  const barLeftX = Math.min(leftHand.x, handPositions.left) - barOverhang;
  const barRightX = Math.max(rightHand.x, handPositions.right) + barOverhang;
  const gripY = Math.round((leftHand.y + rightHand.y) / 2);

  const unilateralRight = (seed & 1) === 1;
  const singleHandX = unilateralRight ? rightHand.x : leftHand.x;
  const singleHandY = unilateralRight ? rightHand.y : leftHand.y;

  const cableTargetX = spec.unilateral ? singleHandX : Math.round((leftHand.x + rightHand.x) / 2);
  const cableTargetY = spec.cablePath === "high_to_low" ? singleHandY - 1 : spec.cablePath === "low_to_high" ? singleHandY + 1 : singleHandY;
  const cableStartY = spec.cablePath === "high_to_low" ? 14 : spec.cablePath === "low_to_high" ? 50 : 28;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-md border border-border bg-[rgb(var(--bg)/0.18)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[1px] ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width="100%" height="100%" className="h-full w-full">
        <g className="text-[rgb(var(--text))]" stroke="currentColor" strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx={shoulder.x} cy={headY} r="3.8" />
          <rect
            x={torsoCenterX - 3.2}
            y={torsoCenterY - torsoHeight / 2}
            width="6.4"
            height={torsoHeight}
            rx="3.2"
            transform={`rotate(${torsoAngle} ${torsoCenterX} ${torsoCenterY})`}
          />
          <path d={`M${shoulder.x - 0.6} ${shoulder.y} L${leftElbow.x} ${leftElbow.y} L${leftHand.x} ${leftHand.y}`} />
          <path d={`M${shoulder.x + 0.6} ${shoulder.y} L${rightElbow.x} ${rightElbow.y} L${rightHand.x} ${rightHand.y}`} />
          <path d={`M${hip.x - 0.6} ${hip.y} L${leftKnee.x} ${leftKnee.y} L${leftFoot.x} ${leftFoot.y}`} />
          <path d={`M${hip.x + 0.6} ${hip.y} L${rightKnee.x} ${rightKnee.y} L${rightFoot.x} ${rightFoot.y}`} />
          {groundY ? <path d={`M14 ${groundY} L50 ${groundY}`} /> : null}
          {benchY ? <path d={`M16 ${benchY + (spec.angle === "decline" ? 2 : 0)} L48 ${benchY + (spec.angle === "incline" ? -2 : 0)}`} /> : null}
        </g>

        <g className="text-accent" stroke="currentColor" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {spec.equipment === "barbell" ? (
            <>
              <rect x={barLeftX} y={gripY - 1.4} width={barRightX - barLeftX} height="2.8" rx="1.4" />
              <rect x={barLeftX - 6} y={gripY - 4.5} width="4" height="9" rx="1.5" />
              <rect x={barLeftX - 11} y={gripY - 4} width="4" height="8" rx="1.5" />
              <rect x={barRightX + 2} y={gripY - 4.5} width="4" height="9" rx="1.5" />
              <rect x={barRightX + 7} y={gripY - 4} width="4" height="8" rx="1.5" />
            </>
          ) : null}

          {spec.equipment === "dumbbell" ? (
            spec.unilateral ? (
              <>
                <rect x={singleHandX - 5} y={singleHandY - 2} width="10" height="4" rx="1.5" />
                <rect x={singleHandX - 7} y={singleHandY - 3.5} width="2" height="7" rx="1" />
                <rect x={singleHandX + 5} y={singleHandY - 3.5} width="2" height="7" rx="1" />
              </>
            ) : (
              <>
                <rect x={leftHand.x - 5} y={leftHand.y - 2} width="10" height="4" rx="1.5" />
                <rect x={rightHand.x - 5} y={rightHand.y - 2} width="10" height="4" rx="1.5" />
                <rect x={leftHand.x - 7} y={leftHand.y - 3.5} width="2" height="7" rx="1" />
                <rect x={leftHand.x + 5} y={leftHand.y - 3.5} width="2" height="7" rx="1" />
                <rect x={rightHand.x - 7} y={rightHand.y - 3.5} width="2" height="7" rx="1" />
                <rect x={rightHand.x + 5} y={rightHand.y - 3.5} width="2" height="7" rx="1" />
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
                  <path d={`M50 ${cableStartY} L${rightHand.x} ${rightHand.y}`} />
                  <path d={`M50 ${cableStartY} L${leftHand.x} ${leftHand.y}`} />
                  <rect x={rightHand.x - 2} y={rightHand.y - 1.5} width="4" height="3" rx="1" fill="currentColor" />
                  <rect x={leftHand.x - 2} y={leftHand.y - 1.5} width="4" height="3" rx="1" fill="currentColor" />
                </>
              )}
            </>
          ) : null}

          {spec.equipment === "machine" ? (
            <>
              <rect x="8" y="12" width="3" height="44" rx="1.5" />
              <rect x="8" y="12" width="16" height="3" rx="1.5" />
              <path d={`M20 38 L${Math.round((rightHand.x + shoulder.x) / 2)} ${Math.round((rightHand.y + shoulder.y) / 2)}`} />
              <circle cx="20" cy="38" r="2" />
            </>
          ) : null}

          {spec.equipment === "cardio" ? (
            spec.kind === "cardio" && spec.variant?.includes("treadmill") ? (
              <>
                <path d="M12 50 L50 50" />
                <path d="M44 22 L52 22 L52 41" />
                <path d="M20 50 L28 40 L38 40" />
              </>
            ) : (
              <>
                <circle cx="20" cy="50" r="4.5" />
                <circle cx="44" cy="50" r="4.5" />
                <path d="M20 50 L32 36 L44 50" />
                <path d="M32 36 L39 36" />
              </>
            )
          ) : null}

          {spec.equipment === "bodyweight" && spec.kind === "core" ? <path d="M18 40 L46 40" /> : null}
        </g>
      </svg>
    </div>
  );
}
