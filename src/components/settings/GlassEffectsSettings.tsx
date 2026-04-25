"use client";

import { useState, useTransition } from "react";
import { updateUnitPreferencesAction } from "@/app/settings/actions";
import { AppButton } from "@/components/ui/AppButton";
import { appTokens } from "@/components/ui/app/tokens";
import { Chip } from "@/components/ui/Chip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
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
    <div className={appTokens.settingsBlockStack}>
      <div className={appTokens.settingsFieldStack}>
        <p className={appTokens.measurementLabel}>Appearance</p>
        <SegmentedControl
          ariaLabel="Appearance mode"
          options={APPEARANCE_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
          value={mode}
          onChange={(nextValue) => setMode(nextValue as GlassEffectsMode)}
        />
        <div className={appTokens.settingsUtilityRow}>
          <Chip tone="today">{activeAppearance.label}</Chip>
          <p className={appTokens.settingsBodyText}>{activeAppearance.description}</p>
        </div>
      </div>

      <div className={appTokens.settingsDivider}>
        <div className={appTokens.settingsFieldStack}>
          <p className={appTokens.measurementLabel}>Weight unit</p>
          <SegmentedControl
            ariaLabel="Weight unit"
            options={WEIGHT_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
            value={weightUnit}
            onChange={(nextValue) => setWeightUnit(nextValue as "lbs" | "kg")}
            size="sm"
          />
        </div>

        <div className={appTokens.settingsFieldStack}>
          <p className={appTokens.measurementLabel}>Distance unit</p>
          <SegmentedControl
            ariaLabel="Distance unit"
            options={DISTANCE_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
            value={distanceUnit}
            onChange={(nextValue) => setDistanceUnit(nextValue as "mi" | "km")}
            size="sm"
          />
        </div>

        <div className={appTokens.settingsFieldStack}>
          <AppButton type="button" variant="primary" fullWidth disabled={!isDirty} loading={isSaving} onClick={saveUnits}>
            Save preferences
          </AppButton>
          <p className={cn(appTokens.settingsBodyText, message?.tone === "error" ? "text-[rgb(var(--button-destructive-text))]" : undefined)}>
            {message?.text ?? "These defaults apply to logging, summaries, and add-exercise flows."}
          </p>
        </div>
      </div>
    </div>
  );
}
