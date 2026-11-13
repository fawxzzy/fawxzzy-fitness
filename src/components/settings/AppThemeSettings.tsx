"use client";

import { useEffect, useState, useTransition } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { CardHeader, CardStatusChip, CardChips, CardMeta, CardSurface, cardTokens } from "@/components/ui/card-system";
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

function normalizeThemeHexInput(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#[\da-fA-F]{6}$/.test(hex)) {
    return hex.toLowerCase();
  }

  if (/^#[\da-fA-F]{3}$/.test(hex)) {
    const [, first, second, third] = hex;
    return `#${first}${first}${second}${second}${third}${third}`.toLowerCase();
  }

  return null;
}

const THEME_COLOR_GROUPS = [
  {
    title: "Text",
    fields: [
      { key: "textPrimaryColor", label: "Primary Text" },
      { key: "textSecondaryColor", label: "Secondary Text" },
      { key: "textMutedColor", label: "Muted Text" },
    ],
  },
  {
    title: "Surfaces & Borders",
    fields: [
      { key: "surfaceCardColor", label: "Card Surface" },
      { key: "cardOutlineColor", label: "Card Outline" },
    ],
  },
  {
    title: "Actions & Selection",
    fields: [
      { key: "primaryActionColor", label: "Primary Action" },
      { key: "secondaryActionColor", label: "Secondary Action" },
      { key: "selectionActiveColor", label: "Selected / Active" },
      { key: "accentYellowColor", label: "Yellow Accent" },
    ],
  },
  {
    title: "Progress & Feedback",
    fields: [
      { key: "successCompleteColor", label: "Success / Complete" },
      { key: "warningColor", label: "Warning Message" },
      { key: "dangerColor", label: "Red Actions" },
      { key: "loaderScanColor", label: "Loading Scan" },
    ],
  },
  {
    title: "Utility Accents",
    fields: [
      { key: "accentDividerColor", label: "Divider Lines" },
      { key: "metricAccentColor", label: "Metric Strips" },
    ],
  },
] as const satisfies ReadonlyArray<{
  title: string;
  description?: string;
  fields: ReadonlyArray<{ key: keyof AppThemeSettings; label: string }>;
}>;

function ThemeColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  return (
    <div className={cn(appTokens.settingsFieldStack, "w-[9rem] max-w-full shrink-0")}>
      <LabeledEditorField label={label} className="w-[9rem] max-w-full">
        <div className="space-y-2 px-3 py-2.5">
          <span className="flex h-11 w-full items-center justify-center overflow-hidden rounded-[calc(var(--radius-md)-4px)]">
            <input
              aria-label={label}
              type="color"
              value={value}
              onChange={(event) => {
                setDraftValue(event.target.value);
                onChange(event.target.value);
              }}
              className="block h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-[calc(var(--radius-md)-4px)] [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-[calc(var(--radius-md)-4px)] [&::-moz-color-swatch]:border-0"
            />
          </span>
          <input
            aria-label={`${label} hex value`}
            type="text"
            inputMode="text"
            spellCheck={false}
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value.slice(0, 7))}
            onBlur={() => {
              const normalizedValue = normalizeThemeHexInput(draftValue);
              if (!normalizedValue) {
                setDraftValue(value);
                return;
              }
              setDraftValue(normalizedValue);
              if (normalizedValue !== value) {
                onChange(normalizedValue);
              }
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }
              event.preventDefault();
              const normalizedValue = normalizeThemeHexInput(draftValue);
              if (!normalizedValue) {
                setDraftValue(value);
                return;
              }
              setDraftValue(normalizedValue);
              if (normalizedValue !== value) {
                onChange(normalizedValue);
              }
            }}
            className={cn(
              labeledEditorFieldControlClassName,
              "h-11 px-2.5 py-2 text-center font-mono text-[11px] uppercase tracking-[0.08em]",
            )}
          />
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

function ThemeChoiceCard({
  title,
  meta,
  selected,
  empty = false,
  onSelect,
}: {
  title: string;
  meta: string;
  selected: boolean;
  /** The "new custom theme" entry: dashed outline, nothing saved yet. */
  empty?: boolean;
  onSelect: () => void;
}) {
  return (
    <CardSurface tone={selected ? "current" : "neutral"} empty={empty} data-theme-choice={empty ? "new" : "saved"}>
      <CardHeader
        title={title}
        meta={<CardMeta items={[meta]} />}
        headingLevel={3}
        chips={selected ? <CardChips><CardStatusChip status="selected" /></CardChips> : undefined}
        interaction={{ kind: "select", selected, onSelect }}
      />
    </CardSurface>
  );
}

export function AppThemeSettings({
}: Record<string, never>) {
  const [theme, setTheme] = useState<AppThemeSettings>(DEFAULT_APP_THEME);
  const [savedThemes, setSavedThemes] = useState<SavedAppThemeSlot[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<AppThemeSelectionId>("default");
  const [themeName, setThemeName] = useState("");
  const [saveMessage, setSaveMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
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
  const canSaveAnyChange = canSaveTheme;
  const newThemeSlotId: CustomAppThemeSlotId | null = isCustomThemeSlotSelected && !selectedSavedTheme
    ? selectedThemeId as CustomAppThemeSlotId
    : nextAvailableThemeSlotId;

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
    <div className="space-y-3">
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

      <ul className={cardTokens.list} aria-label="Themes">
        {APP_THEME_USER_VISIBLE_PRESET_IDS.map((presetId) => (
          <li key={presetId}>
            <ThemeChoiceCard
              title={getAppThemePresetLabel(presetId)}
              meta="Built-in theme"
              selected={selectedThemeId === presetId}
              onSelect={() => selectPresetTheme(presetId)}
            />
          </li>
        ))}
        {APP_THEME_CUSTOM_SLOT_IDS.map((slotId) => {
          const savedTheme = savedThemes.find((entry) => entry.id === slotId);
          if (savedTheme) {
            return (
              <li key={slotId}>
                <ThemeChoiceCard
                  title={savedTheme.name}
                  meta="Custom theme"
                  selected={selectedThemeId === slotId}
                  onSelect={() => selectSavedTheme(savedTheme)}
                />
              </li>
            );
          }

          // One "new theme" entry stands in for the empty slots: the empty slot that is selected right now (for
          // example the one just deleted), otherwise the first free slot. Slot numbers are never shown.
          if (slotId !== newThemeSlotId) {
            return null;
          }

          return (
            <li key={slotId}>
              <ThemeChoiceCard
                title="New custom theme"
                meta="Pick colors and shape, name it, then save"
                selected={selectedThemeId === slotId}
                empty
                onSelect={() => selectEmptySlot(slotId)}
              />
            </li>
          );
        })}
      </ul>

      {saveMessage ? (
        <p
          role={saveMessage.tone === "success" ? "status" : "alert"}
          className={saveMessage.tone === "success" ? appTokens.settingsStatusSuccess : appTokens.settingsStatusError}
        >
          {saveMessage.text}
        </p>
      ) : null}

      {showThemeEditor ? (
        <>
          {showThemeNameField ? (
            <SettingsCard title="Name your theme">
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
            </SettingsCard>
          ) : null}

          {THEME_COLOR_GROUPS.map((group) => (
            <SettingsCard key={group.title} title={group.title}>
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
            </SettingsCard>
          ))}

          <SettingsCard title="Shape">
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
          </SettingsCard>
        </>
      ) : null}
    </div>
  );
}
