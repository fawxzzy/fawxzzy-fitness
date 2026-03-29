"use client";

import { useState, useTransition } from "react";
import { updateUnitPreferencesAction } from "@/app/settings/actions";
import { GlassButton } from "@/components/ui/GlassButton";
import { type GlassEffectsMode, useGlassEffects } from "@/lib/useGlassEffects";

const APPEARANCE_OPTIONS: Array<{ value: GlassEffectsMode; label: string; description: string }> = [
  { value: "on", label: "On", description: "Full blur and sheen" },
  { value: "reduced", label: "Reduced", description: "Lower blur, stronger tint" },
  { value: "off", label: "Off", description: "No blur effects" },
];

const WEIGHT_OPTIONS: Array<{ value: "lbs" | "kg"; label: string }> = [
  { value: "lbs", label: "lbs" },
  { value: "kg", label: "kg" },
];

const DISTANCE_OPTIONS: Array<{ value: "mi" | "km"; label: string }> = [
  { value: "mi", label: "mi" },
  { value: "km", label: "km" },
];

function UnitChoiceButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <GlassButton
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`justify-center px-2 py-2 text-sm ${active ? "border-accent/60 bg-accent/14 text-accent" : "border-white/10 bg-white/5 text-[rgb(var(--text)/0.82)]"}`}
    >
      <span className="font-semibold">{label}</span>
    </GlassButton>
  );
}

export function GlassEffectsSettings({
  preferredWeightUnit,
  preferredDistanceUnit,
}: {
  preferredWeightUnit: "lbs" | "kg";
  preferredDistanceUnit: "mi" | "km";
}) {
  const { mode, setMode } = useGlassEffects();
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">(preferredWeightUnit);
  const [distanceUnit, setDistanceUnit] = useState<"mi" | "km">(preferredDistanceUnit);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isSaving, startSaving] = useTransition();

  const isDirty = weightUnit !== preferredWeightUnit || distanceUnit !== preferredDistanceUnit;

  const saveUnits = () => {
    setMessage(null);
    startSaving(async () => {
      const formData = new FormData();
      formData.set("weightUnit", weightUnit);
      formData.set("distanceUnit", distanceUnit);

      const result = await updateUnitPreferencesAction(formData);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      setMessage({ tone: "success", text: "Preferences saved." });
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Appearance</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Glass effects mode">
          {APPEARANCE_OPTIONS.map((option) => {
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

      <div className="space-y-3 border-t border-white/8 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Weight unit</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Weight unit">
          {WEIGHT_OPTIONS.map((option) => (
            <UnitChoiceButton key={option.value} label={option.label} active={option.value === weightUnit} onClick={() => setWeightUnit(option.value)} />
          ))}
        </div>

        <p className="pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Distance unit</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Distance unit">
          {DISTANCE_OPTIONS.map((option) => (
            <UnitChoiceButton key={option.value} label={option.label} active={option.value === distanceUnit} onClick={() => setDistanceUnit(option.value)} />
          ))}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <GlassButton type="button" disabled={!isDirty || isSaving} onClick={saveUnits} className="px-3 py-2 text-sm font-semibold">
            {isSaving ? "Saving…" : "Save Preferences"}
          </GlassButton>
          <p className={`text-xs ${message?.tone === "error" ? "text-red-200" : "text-[rgb(var(--text-muted)/0.78)]"}`}>
            {message?.text ?? "Used for logging defaults and summaries."}
          </p>
        </div>
      </div>
    </div>
  );
}
