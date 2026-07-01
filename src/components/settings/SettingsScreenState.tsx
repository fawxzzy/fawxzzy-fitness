"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type SettingsSectionKey = "account" | "pro" | "data" | "legacy" | "discord" | "theme" | null;

const SettingsScreenStateContext = createContext<{
  expandedSection: SettingsSectionKey;
  setExpandedSection: React.Dispatch<React.SetStateAction<SettingsSectionKey>>;
} | null>(null);

export function SettingsScreenStateProvider({
  children,
  initialExpandedSection = null,
}: {
  children: ReactNode;
  initialExpandedSection?: SettingsSectionKey;
}) {
  const [expandedSection, setExpandedSection] = useState<SettingsSectionKey>(initialExpandedSection);

  return (
    <SettingsScreenStateContext.Provider value={{ expandedSection, setExpandedSection }}>
      {children}
    </SettingsScreenStateContext.Provider>
  );
}

export function useSettingsScreenState() {
  const context = useContext(SettingsScreenStateContext);
  if (!context) {
    throw new Error("useSettingsScreenState must be used within SettingsScreenStateProvider.");
  }

  return context;
}
