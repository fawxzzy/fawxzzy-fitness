import type { CSSProperties } from "react";
import { ambientBackdropTuning, type AmbientPreset } from "@/lib/ambient/tuning";

type AppEdgeFrameProps = {
  preset: AmbientPreset;
};

type GlyphRailDescriptor = {
  key: string;
  path: string;
  durationSeed: number;
  delayMs: number;
  opacitySeed: number;
};

const GLYPH_RAILS: GlyphRailDescriptor[] = [
  {
    key: "northwest",
    path: "M8 8.5 L16 8.5 L18.6 7.2 L20.8 9.8 L23.2 7.4 L25.8 9.2 L28.2 8.5 L35 8.5 L38 10.2 L40.6 7.8 L43.4 10.5 L46.6 8.5 L51 8.5",
    durationSeed: 0.18,
    delayMs: 0,
    opacitySeed: 0.88,
  },
  {
    key: "northeast",
    path: "M70 8.5 L75.2 8.5 L77.4 10.4 L79.6 7.6 L82.1 9.6 L84.5 8.5 L87.5 8.5 L89.4 11.4 L91.6 8.2 L91.5 14.6 L89.7 17.2 L92 19.7 L89.2 22.1 L91.5 24.8 L91.5 31.5",
    durationSeed: 0.36,
    delayMs: 4400,
    opacitySeed: 0.78,
  },
  {
    key: "southeast",
    path: "M91.5 68.5 L91.5 73.8 L89.4 76.2 L92.1 79.1 L89.8 81.6 L91.5 84.1 L91.5 88.5 L84.6 88.5 L81.9 86.2 L79.4 89 L77 86.8 L74.8 88.5 L68 88.5",
    durationSeed: 0.64,
    delayMs: 9100,
    opacitySeed: 0.84,
  },
  {
    key: "southwest",
    path: "M49 88.5 L43.8 88.5 L41 86.4 L38.6 89.1 L35.8 86.7 L33.1 88.5 L26.5 88.5 L23.6 86.9 L21.3 89.3 L18.9 87.2 L16.4 88.5 L8.5 88.5 L8.5 81.4 L10.8 78.5 L7.9 76 L10.1 73.4 L8.5 70.5",
    durationSeed: 0.84,
    delayMs: 13800,
    opacitySeed: 0.74,
  },
];

function interpolate(min: number, max: number, weight: number) {
  return min + ((max - min) * weight);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function formatUnit(value: number) {
  return Number(value.toFixed(4)).toString();
}

export function AppEdgeFrame({ preset }: AppEdgeFrameProps) {
  const presetTuning = ambientBackdropTuning.presets[preset];
  const reducedMotionTuning = ambientBackdropTuning.reducedMotion;
  const frameOpacity = presetTuning.frameOpacityMultiplier ?? 1;
  const railOpacity = presetTuning.railOpacityMultiplier ?? 1;
  const railMotion = presetTuning.railMotionMultiplier ?? presetTuning.motionMultiplier;
  const frameIntensity = clamp01(interpolate(0.22, 1, presetTuning.intensity) * frameOpacity);
  const reducedFrameIntensity = clamp01(frameIntensity * reducedMotionTuning.frameOpacityMultiplier);
  const frameMotion = Math.max(railMotion, 0.12);
  const reducedRailMotion = Math.max(railMotion * reducedMotionTuning.railMotionMultiplier, 0.01);
  const rootStyle = {
    "--app-edge-frame-static-opacity": formatUnit(interpolate(0.14, 0.28, frameIntensity)),
    "--app-edge-frame-echo-opacity": formatUnit(interpolate(0.04, 0.1, frameIntensity)),
    "--app-edge-frame-corner-opacity": formatUnit(interpolate(0.08, 0.16, frameIntensity)),
    "--app-edge-frame-rail-opacity": formatUnit(
      clamp01(interpolate(0.12, 0.34, frameIntensity) * railOpacity),
    ),
    "--app-edge-frame-rail-highlight-opacity": formatUnit(
      clamp01(interpolate(0.08, 0.18, frameIntensity) * railOpacity),
    ),
    "--app-edge-frame-reduced-static-opacity": formatUnit(interpolate(0.14, 0.28, reducedFrameIntensity)),
    "--app-edge-frame-reduced-echo-opacity": formatUnit(interpolate(0.04, 0.1, reducedFrameIntensity)),
    "--app-edge-frame-reduced-corner-opacity": formatUnit(interpolate(0.08, 0.16, reducedFrameIntensity)),
    "--app-edge-frame-reduced-rail-opacity": formatUnit(
      clamp01(
        interpolate(0.12, 0.34, reducedFrameIntensity)
          * railOpacity
          * reducedMotionTuning.railOpacityMultiplier,
      ),
    ),
    "--app-edge-frame-reduced-rail-highlight-opacity": formatUnit(
      clamp01(
        interpolate(0.08, 0.18, reducedFrameIntensity)
          * railOpacity
          * reducedMotionTuning.railOpacityMultiplier,
      ),
    ),
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="app-edge-frame"
      data-ambient-preset={preset}
      style={rootStyle}
    >
      <div className="app-edge-frame__buffer" />
      <div className="app-edge-frame__line" />
      <div className="app-edge-frame__echo" />
      <div className="app-edge-frame__corners" />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="app-edge-frame__rail"
        aria-hidden="true"
        shapeRendering="geometricPrecision"
      >
        {GLYPH_RAILS.map((rail) => {
          const durationMs = interpolate(14000, 22000, rail.durationSeed) / frameMotion;
          const breatheDurationMs = durationMs * 0.72;
          const reducedDurationMs = interpolate(14000, 22000, rail.durationSeed) / reducedRailMotion;
          const reducedBreatheDurationMs = reducedDurationMs * 0.72;
          const railOpacity = interpolate(0.58, 1, rail.opacitySeed);

          return (
            <g
              key={rail.key}
              className="app-edge-frame__rail-group"
              style={{
                "--app-edge-frame-rail-local-opacity": formatUnit(railOpacity),
                "--app-edge-frame-rail-duration": `${Math.round(durationMs)}ms`,
                "--app-edge-frame-rail-breathe-duration": `${Math.round(breatheDurationMs)}ms`,
                "--app-edge-frame-reduced-rail-duration": `${Math.round(reducedDurationMs)}ms`,
                "--app-edge-frame-reduced-rail-breathe-duration": `${Math.round(reducedBreatheDurationMs)}ms`,
                "--app-edge-frame-rail-delay": `${rail.delayMs}ms`,
              } as CSSProperties}
            >
              <path className="app-edge-frame__rail-path app-edge-frame__rail-path--base" d={rail.path} />
              <path className="app-edge-frame__rail-path app-edge-frame__rail-path--highlight" d={rail.path} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
