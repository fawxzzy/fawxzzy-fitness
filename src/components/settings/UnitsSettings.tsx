"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useIsOnline } from "@/components/session/useIsOnline";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { AppButton } from "@/components/ui/AppButton";
import { CardMeta } from "@/components/ui/card-system";
import { FormField, formFieldControlClassName, formFieldLabelClassName } from "@/components/ui/FormField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";
import {
  buildTimeZoneOptions,
  isDistanceUnit,
  isWeightUnit,
  resolveUnitsSettingsPreset,
  sameUnitsSettings,
  type UnitsSettingsValues,
} from "@/lib/units-settings";

export type UnitsSettingsAction = (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;

const UNITS_TOAST_ID = "settings-units";
const UNITS_NETWORK_FAILED_MESSAGE = "Could not save units and time zone. Check your connection and try again.";

const WEIGHT_OPTIONS = [
  { value: "lbs", label: "lb" },
  { value: "kg", label: "kg" },
];
const DISTANCE_OPTIONS = [
  { value: "mi", label: "mi" },
  { value: "km", label: "km" },
];

function readDevice(): { timeZone: string | null; locale: string | null } {
  try {
    return {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
      locale: typeof navigator !== "undefined" ? navigator.language ?? null : null,
    };
  } catch {
    return { timeZone: null, locale: null };
  }
}

function readAllTimeZones(): readonly string[] {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    return supported ? supported("timeZone") : [];
  } catch {
    return [];
  }
}

/**
 * The "Units & time zone" panel: weight (lb / kg), distance (mi / km) and the time zone, with one Save.
 * While the profile still holds a new account's defaults, the form is preset from this device (its zone, and units
 * from its region) and says so; nothing is written until Save. Saved values are the server's; failures use the
 * in-flow notice (toast), never inline red text. Routines already made keep their own zone and units.
 */
export function UnitsSettings({
  saved,
  action,
}: {
  saved: UnitsSettingsValues;
  action: UnitsSettingsAction;
}) {
  const router = useRouter();
  const toast = useToast();
  const isOnline = useIsOnline();
  const [values, setValues] = useState<UnitsSettingsValues>(saved);
  const [fromDevice, setFromDevice] = useState(false);
  const [deviceZone, setDeviceZone] = useState<string | null>(null);
  const [allZones, setAllZones] = useState<readonly string[]>([]);
  const [isSaving, startSaving] = useTransition();
  const savingRef = useRef(false);
  const touchedRef = useRef(false);
  const choose = (patch: Partial<UnitsSettingsValues>) => {
    touchedRef.current = true;
    setValues((current) => ({ ...current, ...patch }));
  };

  // Device values are only readable in the browser, so the preset lands after hydration (the server renders saved).
  // Keyed on the saved values themselves (not the object), so a parent re-render never wipes an unsaved choice.
  const { weightUnit: savedWeightUnit, distanceUnit: savedDistanceUnit, timeZone: savedTimeZone } = saved;
  useEffect(() => {
    const device = readDevice();
    const savedValues = { weightUnit: savedWeightUnit, distanceUnit: savedDistanceUnit, timeZone: savedTimeZone };
    const preset = resolveUnitsSettingsPreset(savedValues, device);
    const timer = window.setTimeout(() => {
      setDeviceZone(device.timeZone);
      setAllZones(readAllTimeZones());
      // A choice made before this lands (a fast tap during hydration) wins over the device suggestion.
      if (touchedRef.current) return;
      setValues(preset.values);
      setFromDevice(preset.fromDevice);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [savedWeightUnit, savedDistanceUnit, savedTimeZone]);

  const zoneOptions = useMemo(
    () => buildTimeZoneOptions({ current: values.timeZone, device: deviceZone, all: allZones }),
    [values.timeZone, deviceZone, allZones],
  );
  const dirty = !sameUnitsSettings(values, saved);

  const save = () => {
    if (savingRef.current || !dirty) return;
    savingRef.current = true;
    const formData = new FormData();
    formData.set("weightUnit", values.weightUnit);
    formData.set("distanceUnit", values.distanceUnit);
    formData.set("timeZone", values.timeZone);
    startSaving(async () => {
      try {
        const result = await action(formData);
        if (!result.ok) {
          toast.error(result.error, { id: UNITS_TOAST_ID });
          return;
        }
        setFromDevice(false);
        toast.success("Units and time zone saved.", { id: UNITS_TOAST_ID });
        router.refresh();
      } catch {
        toast.error(UNITS_NETWORK_FAILED_MESSAGE, { id: UNITS_TOAST_ID });
      } finally {
        savingRef.current = false;
      }
    });
  };

  return (
    <SettingsCard
      // The open section card above already says "Units & time zone" (DESIGN-CONTRACT 23: no duplicated title).
      title="Your defaults"
      meta={<CardMeta items={[fromDevice && dirty ? "Suggested from this device. Save to keep." : "Used for new routines and logging"]} />}
      data-settings-units="true"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className={formFieldLabelClassName} aria-hidden="true">Weight</p>
          <SegmentedControl
            ariaLabel="Weight unit"
            size="sm"
            value={values.weightUnit}
            options={WEIGHT_OPTIONS}
            onChange={(next) => {
              if (isWeightUnit(next)) choose({ weightUnit: next });
            }}
          />
        </div>
        <div className="min-w-0">
          <p className={formFieldLabelClassName} aria-hidden="true">Distance</p>
          <SegmentedControl
            ariaLabel="Distance unit"
            size="sm"
            value={values.distanceUnit}
            options={DISTANCE_OPTIONS}
            onChange={(next) => {
              if (isDistanceUnit(next)) choose({ distanceUnit: next });
            }}
          />
        </div>
      </div>

      <FormField label="Time zone" helper="Routines you already made keep their own time zone.">
        {(control) => (
          <>
          <select
            {...control}
            name="timeZone"
            value={values.timeZone}
            onChange={(event) => {
              const next = event.target.value;
              choose({ timeZone: next });
            }}
            className={cn(formFieldControlClassName, "appearance-none truncate pr-9")}
          >
            <optgroup label="Common">
              {zoneOptions.common.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </optgroup>
            {zoneOptions.all.length > 0 ? (
              <optgroup label="All time zones">
                {zoneOptions.all.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </optgroup>
            ) : null}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--text-secondary))]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5.5 8l4.5 4.5L14.5 8" />
          </svg>
          </>
        )}
      </FormField>

      <AppButton
        type="button"
        variant={dirty ? "primary" : "secondary"}
        fullWidth
        onClick={save}
        disabled={!dirty || !isOnline}
        loading={isSaving}
      >
        {dirty ? "Save" : "Saved"}
      </AppButton>
      {!isOnline ? (
        <p className="m-0 text-xs leading-snug text-[rgb(var(--text-secondary)/0.95)]" role="status">
          You are offline. Reconnect to save.
        </p>
      ) : null}
    </SettingsCard>
  );
}
