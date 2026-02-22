"use client";

import { Glass } from "@/components/ui/Glass";
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
    <Glass variant="base" className="space-y-3 p-4" interactive={false}>
      <div>
        <h2 className="text-sm font-semibold">Glass Effects</h2>
        <p className="text-xs text-[rgb(var(--text)/0.72)]">Pick visual intensity for translucent surfaces.</p>
      </div>
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
              className={`flex-col gap-1 px-2 py-2 text-center text-xs ${isActive ? "border-accent/70 bg-accent/18 text-accent" : "text-[rgb(var(--text)/0.82)]"}`}
            >
              <span className="font-semibold">{option.label}</span>
              <span className="text-[10px] opacity-80">{option.description}</span>
            </GlassButton>
          );
        })}
      </div>
    </Glass>
  );
}

