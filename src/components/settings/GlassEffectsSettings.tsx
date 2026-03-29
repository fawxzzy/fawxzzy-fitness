"use client";

import { GlassButton } from "@/components/ui/GlassButton";
import { type GlassEffectsMode, useGlassEffects } from "@/lib/useGlassEffects";

const OPTIONS: Array<{ value: GlassEffectsMode; label: string; description: string }> = [
  { value: "on", label: "On", description: "Full blur and sheen" },
  { value: "reduced", label: "Reduced", description: "Lower blur, stronger tint" },
  { value: "off", label: "Off", description: "No blur effects" },
];

export function GlassEffectsSettings() {
  const { mode, setMode } = useGlassEffects();

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Glass effects mode">
        {OPTIONS.map((option) => {
          const isActive = option.value === mode;

          return (
            <GlassButton
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setMode(option.value)}
              className={`flex-col gap-0.5 px-2 py-2 text-center text-xs ${isActive ? "border-accent/60 bg-accent/14 text-accent" : "border-white/10 bg-white/5 text-[rgb(var(--text)/0.82)]"}`}
            >
              <span className="font-semibold">{option.label}</span>
              <span className="text-[10px] opacity-80">{option.description}</span>
            </GlassButton>
          );
        })}
      </div>
    </div>
  );
}
