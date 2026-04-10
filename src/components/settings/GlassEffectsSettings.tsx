"use client";

import { useState, useTransition } from "react";
import { updateUnitPreferencesAction } from "@/app/settings/actions";
import { AppButton } from "@/components/ui/AppButton";
import { Chip } from "@/components/ui/Chip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { type GlassEffectsMode, useGlassEffects } from "@/lib/useGlassEffects";

const APPEARANCE_OPTIONS: Array<{ value: GlassEffectsMode; label: string; description: string }> = [
  { value: "on", label: "Coated", description: "Sharper glass with subtle blur" },
  { value: "reduced", label: "Performance", description: "Lower blur and stronger contrast" },
  { value: "off", label: "Solid", description: "No blur, darkest surfaces" },
];

const WEIGHT_OPTIONS: Array<{ value: "lbs" | "kg"; label: string }> = [
  { value: "lbs", label: "lbs" },
  { value: "kg", label: "kg" },
];

const DISTANCE_OPTIONS: Array<{ value: "mi" | "km"; label: string }> = [
  { value: "mi", label: "mi" },
  { value: "km", label: "km" },
];

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
  const activeAppearance = APPEARANCE_OPTIONS.find((option) => option.value === mode) ?? APPEARANCE_OPTIONS[0];

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
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]">Appearance</p>
        <SegmentedControl
          ariaLabel="Appearance mode"
          options={APPEARANCE_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
          value={mode}
          onChange={(nextValue) => setMode(nextValue as GlassEffectsMode)}
        />
        <div className="flex items-center gap-2">
          <Chip tone="today">{activeAppearance.label}</Chip>
          <p className="text-sm text-[rgb(var(--text-secondary)/0.96)]">{activeAppearance.description}</p>
        </div>
      </div>

      <div className="space-y-4 border-t border-[rgb(var(--border)/0.18)] pt-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]">Weight unit</p>
          <SegmentedControl
            ariaLabel="Weight unit"
            options={WEIGHT_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
            value={weightUnit}
            onChange={(nextValue) => setWeightUnit(nextValue as "lbs" | "kg")}
            size="sm"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]">Distance unit</p>
          <SegmentedControl
            ariaLabel="Distance unit"
            options={DISTANCE_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
            value={distanceUnit}
            onChange={(nextValue) => setDistanceUnit(nextValue as "mi" | "km")}
            size="sm"
          />
        </div>

        <div className="space-y-2">
          <AppButton type="button" variant="primary" fullWidth disabled={!isDirty} loading={isSaving} onClick={saveUnits}>
            Save preferences
          </AppButton>
          <p className={`text-sm leading-5 ${message?.tone === "error" ? "text-[rgb(var(--button-destructive-text))]" : "text-[rgb(var(--text-secondary)/0.92)]"}`}>
            {message?.text ?? "These defaults apply to logging, summaries, and add-exercise flows."}
          </p>
        </div>
      </div>
    </div>
  );
}
