"use client";

import { useEffect, useState, useTransition } from "react";
import { updateUnitPreferencesAction } from "@/app/settings/actions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { appTokens } from "@/components/ui/app/tokens";
import { mergeAppBootPreferences } from "@/lib/app-boot-preferences";
import {
  APP_THEME_CUSTOM_SLOT_IDS,
  APP_THEME_NAME_MAX_LENGTH,
  APP_THEME_PRESETS,
  APP_THEME_USER_VISIBLE_PRESET_IDS,
  applyAppTheme,
  areAppThemesEqual,
  DEFAULT_APP_THEME,
  ROSE_APP_THEME,
  getAppThemePresetLabel,
  getNextAvailableAppThemeSlotId,
  readStoredAppThemeLibrary,
  readStoredAppThemeSelection,
  resolveStoredAppTheme,
  sanitizeAppThemeName,
  type AppThemePreset,
  type AppThemeSelectionId,
  type CustomAppThemeSlotId,
  type AppThemeSettings,
  type SavedAppThemeSlot,
  writeStoredAppTheme,
  writeStoredAppThemeLibrary,
  writeStoredAppThemeSelection,
} from "@/lib/app-theme";
import { cn } from "@/lib/cn";

const WEIGHT_OPTIONS: Array<{ value: "lbs" | "kg"; label: string }> = [
  { value: "lbs", label: "lbs" },
  { value: "kg", label: "kg" },
];

const DISTANCE_OPTIONS: Array<{ value: "mi" | "km"; label: string }> = [
  { value: "mi", label: "mi" },
  { value: "km", label: "km" },
];

const THEME_COLOR_GROUPS = [
  {
    title: "Text",
    description: "Global text tiers for the bright, supporting, and muted copy used across the app.",
    fields: [
      { key: "textPrimaryColor", label: "Primary Text" },
      { key: "textSecondaryColor", label: "Secondary Text" },
      { key: "textMutedColor", label: "Muted Text" },
    ],
  },
  {
    title: "Core",
    description: "Buttons and the main card surfaces used across the app.",
    fields: [
      { key: "primaryActionColor", label: "Primary Action" },
      { key: "secondaryActionColor", label: "Secondary Action" },
      { key: "surfaceCardColor", label: "Cards & Surfaces" },
      { key: "cardOutlineColor", label: "Card Outlines" },
    ],
  },
  {
    title: "State & Feedback",
    description: "Progress, warning, destructive, and active-state colors for shared flows.",
    fields: [
      { key: "successCompleteColor", label: "Success" },
      { key: "warningColor", label: "Warning" },
      { key: "dangerColor", label: "Red Actions" },
      { key: "selectionActiveColor", label: "Selected / Active" },
    ],
  },
  {
    title: "Accents",
    description: "Supporting lines, Done status tags, and motion highlights that tie the system together.",
    fields: [
      { key: "accentDividerColor", label: "Accent Lines / Done" },
      { key: "metricAccentColor", label: "Metric Strips" },
      { key: "loaderScanColor", label: "Loading Scan" },
    ],
  },
] as const satisfies ReadonlyArray<{
  title: string;
  description: string;
  fields: ReadonlyArray<{ key: keyof AppThemeSettings; label: string }>;
}>;

const THEME_PANEL_SHELL_CLASSNAME =
  "-mx-5 rounded-[var(--radius-lg)] border border-transparent bg-[rgb(var(--surface-1-rgb)/0.14)] shadow-[0_20px_44px_rgba(0,0,0,0.16)] supports-[backdrop-filter]:bg-[rgb(var(--surface-1-rgb)/0.08)]";

function ThemeHeroTray({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(THEME_PANEL_SHELL_CLASSNAME, "space-y-3 p-4 sm:p-5")}>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function ThemeSectionDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-1.5", className)}>
      <MetricAccentBar variant="thin" className="w-3/4 opacity-85" />
    </div>
  );
}

function ThemePanelSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(THEME_PANEL_SHELL_CLASSNAME, "space-y-3 p-4 sm:p-5")}>
      <div className="space-y-1 text-center">
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-primary)/0.96)]">{title}</h3>
        <p className={appTokens.settingsBodyText}>{description}</p>
      </div>
      {children}
    </section>
  );
}

function ThemeColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  return (
    <div className={cn(appTokens.settingsFieldStack, "w-[9rem] max-w-full shrink-0")}>
      <LabeledEditorField label={label} className="w-[9rem] max-w-full">
        <div className="px-3 py-2.5">
          <span className="flex h-10 w-full items-center justify-center overflow-hidden rounded-[calc(var(--radius-md)-4px)]">
            <input
              aria-label={label}
              type="color"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="block h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-[calc(var(--radius-md)-4px)] [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-[calc(var(--radius-md)-4px)] [&::-moz-color-swatch]:border-0"
            />
          </span>
        </div>
      </LabeledEditorField>
    </div>
  );
}

function ThemeRangeField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (nextValue: number) => void;
}) {
  return (
    <div className={cn(appTokens.settingsFieldStack, "w-fit space-y-2")}>
      <div className="mx-auto flex w-[7.5rem] items-center justify-between gap-3">
        <p className={cn(appTokens.settingsFieldLabel, "text-left")}>{label}</p>
        <LabeledEditorField label="PX" className="w-[3.35rem] shrink-0">
          <input
            aria-label={`${label} value`}
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              if (!Number.isFinite(nextValue)) {
                return;
              }
              onChange(Math.min(max, Math.max(min, nextValue)));
            }}
            className={cn(
              labeledEditorFieldControlClassName,
              "h-11 px-1.5 py-2 text-center text-sm font-semibold",
            )}
          />
        </LabeledEditorField>
      </div>
      <div className="flex justify-center">
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 w-[7.5rem] max-w-full cursor-pointer accent-[rgb(var(--accent))]"
        />
      </div>
    </div>
  );
}

function ThemeSlotButton({
  label,
  active,
  empty = false,
  onClick,
}: {
  label: string;
  active: boolean;
  empty?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[3.15rem] w-fit max-w-full min-w-0 items-center justify-center rounded-[var(--radius-md)] border px-[10px] py-2.5 text-center transition-[border-color,background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]",
        active
          ? "border-[rgb(var(--accent-divider-rgb))] bg-[linear-gradient(180deg,rgb(var(--accent-divider-rgb)/0.2),rgb(var(--accent-divider-rgb)/0.08))] text-[rgb(var(--accent-divider-rgb))] shadow-[inset_0_0_0_1px_rgb(var(--accent-divider-rgb)/0.5),0_0_0_1px_rgb(var(--accent-divider-rgb)/0.2),0_0_18px_rgb(var(--accent-divider-rgb)/0.18)]"
          : empty
            ? "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.28)] text-[rgb(var(--text-muted)/0.88)] hover:border-[rgb(var(--border-strong)/0.28)]"
            : "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.28)] text-[rgb(var(--text-primary)/0.96)] hover:border-[rgb(var(--border-strong)/0.28)]",
      )}
    >
      <span
        className={cn(
          "block max-w-full overflow-hidden text-clip whitespace-nowrap text-[0.64rem] font-semibold uppercase tracking-[0.02em]",
          active && "text-[rgb(var(--accent-divider-rgb))]",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function AppThemeSettings({
  preferredWeightUnit,
  preferredDistanceUnit,
}: {
  preferredWeightUnit: "lbs" | "kg";
  preferredDistanceUnit: "mi" | "km";
}) {
  const [theme, setTheme] = useState<AppThemeSettings>(DEFAULT_APP_THEME);
  const [savedThemes, setSavedThemes] = useState<SavedAppThemeSlot[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<AppThemeSelectionId>("default");
  const [themeName, setThemeName] = useState("");
  const [saveMessage, setSaveMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">(preferredWeightUnit);
  const [distanceUnit, setDistanceUnit] = useState<"mi" | "km">(preferredDistanceUnit);
  const [savedWeightUnit, setSavedWeightUnit] = useState<"lbs" | "kg">(preferredWeightUnit);
  const [savedDistanceUnit, setSavedDistanceUnit] = useState<"mi" | "km">(preferredDistanceUnit);
  const [isSaving, startSaving] = useTransition();
  const [isThemeNameFocused, setIsThemeNameFocused] = useState(false);

  useEffect(() => {
    const storedTheme = resolveStoredAppTheme();
    const storedThemes = readStoredAppThemeLibrary();
    const storedSelection = readStoredAppThemeSelection();
    const matchingTheme = storedThemes.find((storedSlot) => areAppThemesEqual(storedSlot.theme, storedTheme));

    setTheme(storedTheme);
    setSavedThemes(storedThemes);
    if (storedSelection === "default" || storedSelection === "rose" || storedSelection === "test") {
      setSelectedThemeId(storedSelection);
      setThemeName("");
    } else if (storedSelection) {
      const selectedSlot = storedThemes.find((storedSlot) => storedSlot.id === storedSelection) ?? null;
      setSelectedThemeId(storedSelection);
      setThemeName(selectedSlot?.name ?? "");
    } else if (matchingTheme) {
      setSelectedThemeId(matchingTheme.id);
      setThemeName(matchingTheme.name);
    } else if (areAppThemesEqual(storedTheme, ROSE_APP_THEME)) {
      setSelectedThemeId("rose");
      setThemeName("");
    } else if (areAppThemesEqual(storedTheme, DEFAULT_APP_THEME)) {
      setSelectedThemeId("default");
      setThemeName("");
    } else {
      setSelectedThemeId(getNextAvailableAppThemeSlotId(storedThemes) ?? storedThemes[0]?.id ?? "custom-1");
      setThemeName("");
    }
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    applyAppTheme(theme);
    writeStoredAppTheme(theme);
    mergeAppBootPreferences({
      theme,
      themeSelection: selectedThemeId,
    });
  }, [hasLoaded, selectedThemeId, theme]);

  const updateTheme = (updater: (currentTheme: AppThemeSettings) => AppThemeSettings) => {
    setSaveMessage(null);
    setTheme((currentTheme) => updater(currentTheme));
  };

  const updateColor = (key: keyof AppThemeSettings, nextValue: string) => {
    updateTheme((currentTheme) => ({
      ...currentTheme,
      [key]: nextValue,
    }));
  };

  const isDefaultThemeSelected = selectedThemeId === "default";
  const isCustomThemeSlotSelected = APP_THEME_CUSTOM_SLOT_IDS.includes(selectedThemeId as CustomAppThemeSlotId);
  const selectedSavedTheme = isCustomThemeSlotSelected
    ? savedThemes.find((savedTheme) => savedTheme.id === selectedThemeId) ?? null
    : null;
  const selectedPresetTheme = !isCustomThemeSlotSelected
    ? APP_THEME_PRESETS[selectedThemeId as AppThemePreset] ?? DEFAULT_APP_THEME
    : null;
  const normalizedThemeName = sanitizeAppThemeName(themeName);
  const selectedThemeBaseName = selectedSavedTheme?.name ?? "";
  const selectedThemeBase = selectedSavedTheme?.theme ?? selectedPresetTheme ?? DEFAULT_APP_THEME;
  const nextAvailableThemeSlotId = getNextAvailableAppThemeSlotId(savedThemes);
  const hasThemeContentChange = !areAppThemesEqual(theme, selectedThemeBase);
  const hasThemeNameChange = normalizedThemeName !== selectedThemeBaseName;
  const hasActiveThemeChange = hasThemeContentChange || hasThemeNameChange;
  const showThemeEditor = isCustomThemeSlotSelected;
  const showThemeNameField = showThemeEditor && (!selectedSavedTheme || hasThemeContentChange || normalizedThemeName.length > 0);
  const canSaveTheme = normalizedThemeName.length > 0
    && hasActiveThemeChange
    && (isCustomThemeSlotSelected || nextAvailableThemeSlotId !== null);
  const hasUnitPreferenceChange = weightUnit !== savedWeightUnit || distanceUnit !== savedDistanceUnit;
  const canSaveAnyChange = canSaveTheme || hasUnitPreferenceChange;

  const selectPresetTheme = (preset: AppThemePreset) => {
    setSelectedThemeId(preset);
    setThemeName("");
    setSaveMessage(null);
    setTheme(APP_THEME_PRESETS[preset]);
    writeStoredAppThemeSelection(preset);
  };

  const selectSavedTheme = (savedTheme: SavedAppThemeSlot) => {
    setSelectedThemeId(savedTheme.id);
    setThemeName(savedTheme.name);
    setSaveMessage(null);
    setTheme(savedTheme.theme);
    writeStoredAppThemeSelection(savedTheme.id);
  };

  const selectEmptySlot = (slotId: CustomAppThemeSlotId) => {
    setSelectedThemeId(slotId);
    setThemeName("");
    setSaveMessage(null);
    writeStoredAppThemeSelection(slotId);
  };

  const saveTheme = () => {
    setSaveMessage(null);
    startSaving(async () => {
      const successMessages: string[] = [];
      const errorMessages: string[] = [];

      if (hasUnitPreferenceChange) {
        const formData = new FormData();
        formData.set("weightUnit", weightUnit);
        formData.set("distanceUnit", distanceUnit);

        const result = await updateUnitPreferencesAction(formData);
        if (!result.ok) {
          errorMessages.push(result.error);
        } else {
          setSavedWeightUnit(weightUnit);
          setSavedDistanceUnit(distanceUnit);
          successMessages.push("Preferences saved.");
        }
      }

      if (canSaveTheme) {
        const normalizedName = sanitizeAppThemeName(themeName);
        const targetSlotId: CustomAppThemeSlotId | null = isCustomThemeSlotSelected
          ? selectedThemeId as CustomAppThemeSlotId
          : getNextAvailableAppThemeSlotId(savedThemes);

        if (!targetSlotId) {
          errorMessages.push("Select a saved theme slot to overwrite.");
        } else {
          const nextSavedThemes = [...savedThemes.filter((savedTheme) => savedTheme.id !== targetSlotId), {
            id: targetSlotId,
            name: normalizedName,
            theme,
          }].sort((left, right) => APP_THEME_CUSTOM_SLOT_IDS.indexOf(left.id) - APP_THEME_CUSTOM_SLOT_IDS.indexOf(right.id));

          writeStoredAppThemeLibrary(nextSavedThemes);
          setSavedThemes(nextSavedThemes);
          setSelectedThemeId(targetSlotId);
          setThemeName(normalizedName);
          writeStoredAppThemeSelection(targetSlotId);
          successMessages.push(`"${normalizedName}" saved.`);
        }
      } else if (hasActiveThemeChange) {
        errorMessages.push(`Theme name is required and must be ${APP_THEME_NAME_MAX_LENGTH} characters or fewer.`);
      }

      if (errorMessages.length > 0) {
        setSaveMessage({
          tone: "error",
          text: [...successMessages, ...errorMessages].join(" "),
        });
        return;
      }

      if (successMessages.length > 0) {
        setSaveMessage({
          tone: "success",
          text: successMessages.join(" "),
        });
      }
    });
  };

  const deleteTheme = () => {
    if (!selectedSavedTheme) {
      setSaveMessage({
        tone: "error",
        text: "Select a saved theme to delete.",
      });
      return;
    }

    const nextSavedThemes = savedThemes.filter((savedTheme) => savedTheme.id !== selectedSavedTheme.id);
    writeStoredAppThemeLibrary(nextSavedThemes);
    setSavedThemes(nextSavedThemes);
    setSelectedThemeId(selectedSavedTheme.id);
    setThemeName("");
    writeStoredAppThemeSelection(selectedSavedTheme.id);
    setSaveMessage({
      tone: "success",
      text: `"${selectedSavedTheme.name}" deleted.`,
    });
  };

  return (
    <div className="space-y-4 pt-2">
      {isCustomThemeSlotSelected ? (
        <PublishBottomActions>
          <BottomActionSplit
            secondary={(
              <BottomDockButton
                type="button"
                intent="danger"
                onClick={deleteTheme}
                disabled={!selectedSavedTheme}
              >
                Delete
              </BottomDockButton>
            )}
            primary={(
              <BottomDockButton
                type="button"
                intent="positive"
                onClick={saveTheme}
                disabled={!canSaveAnyChange}
                loading={isSaving}
              >
                Save
              </BottomDockButton>
            )}
          />
        </PublishBottomActions>
      ) : null}

      <ThemeHeroTray>
        <div className="space-y-3">
          {showThemeNameField ? (
            <div className={appTokens.settingsFieldStack}>
              <LabeledEditorField
                label="Theme name"
                className="w-full"
              >
                <input
                  aria-label="Theme name"
                  type="text"
                  value={themeName}
                  maxLength={APP_THEME_NAME_MAX_LENGTH}
                  placeholder={isThemeNameFocused && themeName.length === 0 ? "" : "Theme name"}
                  onFocus={() => setIsThemeNameFocused(true)}
                  onBlur={() => setIsThemeNameFocused(false)}
                  onChange={(event) => {
                    setSaveMessage(null);
                    setThemeName(sanitizeAppThemeName(event.target.value));
                  }}
                  className={cn(
                    labeledEditorFieldControlClassName,
                    "h-14 px-[10px] py-3 text-center",
                  )}
                />
              </LabeledEditorField>
            </div>
          ) : null}
          <div className={appTokens.settingsFieldStack}>
            <div className="flex flex-wrap justify-center gap-2">
              {APP_THEME_USER_VISIBLE_PRESET_IDS.map((presetId) => (
                <ThemeSlotButton
                  key={presetId}
                  label={getAppThemePresetLabel(presetId)}
                  active={selectedThemeId === presetId}
                  onClick={() => selectPresetTheme(presetId)}
                />
              ))}
              {APP_THEME_CUSTOM_SLOT_IDS.map((slotId, index) => {
                const savedTheme = savedThemes.find((entry) => entry.id === slotId);
                return (
                  <ThemeSlotButton
                    key={slotId}
                    label={savedTheme?.name ?? `Slot ${index + 1}`}
                    active={selectedThemeId === slotId}
                    empty={!savedTheme}
                    onClick={() => savedTheme ? selectSavedTheme(savedTheme) : selectEmptySlot(slotId)}
                  />
                );
              })}
            </div>
          </div>

          {saveMessage ? (
            <p className={saveMessage.tone === "success" ? appTokens.settingsStatusSuccess : appTokens.settingsStatusError}>
              {saveMessage.text}
            </p>
          ) : null}
        </div>
      </ThemeHeroTray>

      {showThemeEditor ? (
        <>
          <ThemeSectionDivider />

          <ThemePanelSection
            title="Units"
            description="Choose the measurement units used across routines, sessions, and progress displays."
          >
            <div className="flex flex-wrap items-start justify-center gap-x-5 gap-y-3">
              <div className={cn(appTokens.settingsFieldStack, "w-fit items-center text-center")}>
                <p className={cn(appTokens.settingsFieldLabel, "w-full text-center")}>Weight</p>
                <SegmentedControl
                  ariaLabel="Weight unit"
                  options={WEIGHT_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
                  value={weightUnit}
                  onChange={(nextValue) => {
                    setSaveMessage(null);
                    setWeightUnit(nextValue as "lbs" | "kg");
                  }}
                  size="sm"
                  activeIntent="positive"
                  fitContent
                  className="mx-auto"
                  shellClassName="!border-transparent !bg-transparent !shadow-none !p-0 gap-1.5"
                />
              </div>

              <div className={cn(appTokens.settingsFieldStack, "w-fit items-center text-center")}>
                <p className={cn(appTokens.settingsFieldLabel, "w-full text-center")}>Distance</p>
                <SegmentedControl
                  ariaLabel="Distance unit"
                  options={DISTANCE_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
                  value={distanceUnit}
                  onChange={(nextValue) => {
                    setSaveMessage(null);
                    setDistanceUnit(nextValue as "mi" | "km");
                  }}
                  size="sm"
                  activeIntent="positive"
                  fitContent
                  className="mx-auto"
                  shellClassName="!border-transparent !bg-transparent !shadow-none !p-0 gap-1.5"
                />
              </div>
            </div>
          </ThemePanelSection>

          <ThemeSectionDivider />

          {THEME_COLOR_GROUPS.map((group) => (
            <div key={group.title} className="space-y-4">
              <ThemePanelSection title={group.title} description={group.description}>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {group.fields.map((field) => (
                    <ThemeColorField
                      key={field.key}
                      label={field.label}
                      value={theme[field.key] as string}
                      onChange={(nextValue) => updateColor(field.key, nextValue)}
                    />
                  ))}
                </div>
              </ThemePanelSection>
              <ThemeSectionDivider />
            </div>
          ))}

          <ThemePanelSection
            title="Shape"
            description="Set how rounded buttons and cards should feel across shared flows."
          >
            <div className="flex flex-wrap justify-center gap-3">
              <ThemeRangeField
                label="Button Radius"
                min={10}
                max={28}
                value={theme.buttonRadius}
                onChange={(nextValue) => updateTheme((currentTheme) => ({
                  ...currentTheme,
                  buttonRadius: nextValue,
                }))}
              />
              <ThemeRangeField
                label="Card Radius"
                min={14}
                max={36}
                value={theme.cardRadius}
                onChange={(nextValue) => updateTheme((currentTheme) => ({
                  ...currentTheme,
                  cardRadius: nextValue,
                }))}
              />
            </div>
          </ThemePanelSection>
        </>
      ) : null}
    </div>
  );
}
