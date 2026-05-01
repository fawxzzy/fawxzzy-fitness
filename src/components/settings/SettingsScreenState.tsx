"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type SettingsSectionKey = "account" | "legacy" | "theme" | null;

const SettingsScreenStateContext = createContext<{
  expandedSection: SettingsSectionKey;
  setExpandedSection: React.Dispatch<React.SetStateAction<SettingsSectionKey>>;
} | null>(null);

export function SettingsScreenStateProvider({ children }: { children: ReactNode }) {
  const [expandedSection, setExpandedSection] = useState<SettingsSectionKey>(null);

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
