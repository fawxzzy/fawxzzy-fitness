"use client";

import { useState } from "react";
import { AccountSettingsForm } from "@/components/settings/AccountSettingsForm";
import { GlassEffectsSettings } from "@/components/settings/GlassEffectsSettings";
import { LegacyMigrationSettings } from "@/components/settings/LegacyMigrationSettings";
import { SignatureMetaTag } from "@/components/ui/app/SignatureSeparator";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { cn } from "@/lib/cn";

type SettingsSectionKey = "account" | "legacy" | "preferences" | null;

function SettingsAccordionTrigger({
  title,
  expanded,
  onClick,
  tag,
}: {
  title: string;
  expanded: boolean;
  onClick: () => void;
  tag?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onClick}
      className="relative flex min-h-[4.15rem] w-full items-center justify-center rounded-[1.15rem] border border-[rgb(var(--border-strong)/0.24)] bg-[rgb(var(--surface-2)/0.22)] text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
    >
      <span className="text-[1.05rem] font-semibold leading-tight text-[rgb(var(--text-primary)/0.98)]">{title}</span>
      {tag ? (
        <span className="absolute right-[2rem] top-1/2 -translate-y-1/2">
          <SignatureMetaTag>{tag}</SignatureMetaTag>
        </span>
      ) : null}
      <span className="absolute bottom-[0.78rem] right-[0.85rem] text-[rgb(var(--text-muted)/0.84)]">
        {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
      </span>
    </button>
  );
}

export function SettingsAccordionClient({
  email,
  username,
  legacyBridgeConfigured,
  preferredWeightUnit,
  preferredDistanceUnit,
}: {
  email: string;
  username: string;
  legacyBridgeConfigured: boolean;
  preferredWeightUnit: "lbs" | "kg";
  preferredDistanceUnit: "mi" | "km";
}) {
  const [expandedSection, setExpandedSection] = useState<SettingsSectionKey>("account");

  const isFocused = expandedSection !== null;
  const showAccount = expandedSection === null || expandedSection === "account";
  const showLegacy = expandedSection === null || expandedSection === "legacy";
  const showPreferences = expandedSection === null || expandedSection === "preferences";

  return (
    <div className="space-y-3">
      {showAccount ? (
        <div className="space-y-3">
          <SettingsAccordionTrigger
            title="Data & Account"
            expanded={expandedSection === "account"}
            onClick={() => setExpandedSection((current) => current === "account" ? null : "account")}
          />
          {expandedSection === "account" ? <AccountSettingsForm email={email} username={username} /> : null}
        </div>
      ) : null}

      {showPreferences ? (
        <div className="space-y-3">
          <SettingsAccordionTrigger
            title="Preferences"
            expanded={expandedSection === "preferences"}
            onClick={() => setExpandedSection((current) => current === "preferences" ? null : "preferences")}
          />
          {expandedSection === "preferences" ? (
            <GlassEffectsSettings
              preferredWeightUnit={preferredWeightUnit}
              preferredDistanceUnit={preferredDistanceUnit}
            />
          ) : null}
        </div>
      ) : null}

      {showLegacy ? (
        <div className="space-y-3">
          <SettingsAccordionTrigger
            title="Import Legacy Data"
            expanded={expandedSection === "legacy"}
            onClick={() => setExpandedSection((current) => current === "legacy" ? null : "legacy")}
          />
          {expandedSection === "legacy" ? (
            <LegacyMigrationSettings
              legacyBridgeConfigured={legacyBridgeConfigured}
              defaultLegacyEmail={email}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
