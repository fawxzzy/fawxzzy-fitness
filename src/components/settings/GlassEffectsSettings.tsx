"use client";

import { useState, useTransition } from "react";
import { updateUnitPreferencesAction } from "@/app/settings/actions";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { appTokens } from "@/components/ui/app/tokens";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";

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
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">(preferredWeightUnit);
  const [distanceUnit, setDistanceUnit] = useState<"mi" | "km">(preferredDistanceUnit);
  const [savedWeightUnit, setSavedWeightUnit] = useState<"lbs" | "kg">(preferredWeightUnit);
  const [savedDistanceUnit, setSavedDistanceUnit] = useState<"mi" | "km">(preferredDistanceUnit);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isSaving, startSaving] = useTransition();

  const isDirty = weightUnit !== savedWeightUnit || distanceUnit !== savedDistanceUnit;

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

      setSavedWeightUnit(weightUnit);
      setSavedDistanceUnit(distanceUnit);
      setMessage({ tone: "success", text: "Preferences saved." });
    });
  };

  return (
    <div className="space-y-3 pt-2">
      <PublishBottomActions>
        <BottomActionSingle>
          <BottomDockButton type="button" intent="positive" disabled={!isDirty} loading={isSaving} onClick={saveUnits}>
            Save
          </BottomDockButton>
        </BottomActionSingle>
      </PublishBottomActions>

      <div className="grid grid-cols-2 gap-3">
        <div className={cn(appTokens.settingsFieldStack, "items-center text-center")}>
          <p className={cn(appTokens.settingsFieldLabel, "w-full text-center")}>Weight unit</p>
          <SegmentedControl
            ariaLabel="Weight unit"
            options={WEIGHT_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
            value={weightUnit}
            onChange={(nextValue) => setWeightUnit(nextValue as "lbs" | "kg")}
            size="sm"
            activeIntent="positive"
          />
        </div>

        <div className={cn(appTokens.settingsFieldStack, "items-center text-center")}>
          <p className={cn(appTokens.settingsFieldLabel, "w-full text-center")}>Distance unit</p>
          <SegmentedControl
            ariaLabel="Distance unit"
            options={DISTANCE_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
            value={distanceUnit}
            onChange={(nextValue) => setDistanceUnit(nextValue as "mi" | "km")}
            size="sm"
            activeIntent="positive"
          />
        </div>
      </div>

      <div className={appTokens.settingsFieldStack}>
        {message?.text ? (
          <p
            className={[
              appTokens.settingsBodyText,
              message?.tone === "error"
                ? appTokens.settingsStatusError
                : message?.tone === "success"
                  ? appTokens.settingsStatusSuccess
                  : undefined,
            ].filter(Boolean).join(" ")}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
