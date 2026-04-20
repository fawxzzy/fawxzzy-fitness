import { fitnessDesignPrimitiveClassNames } from "@/components/ui/app/designSystem";

export const appTokens = {
  panelBase: fitnessDesignPrimitiveClassNames.card.panelBase,
  panelMuted: fitnessDesignPrimitiveClassNames.card.panelMuted,
  rowBase: fitnessDesignPrimitiveClassNames.card.rowBase,
  rowInteractive: fitnessDesignPrimitiveClassNames.card.rowInteractive,
  rowAccent: fitnessDesignPrimitiveClassNames.card.rowAccent,
  rowDefault: fitnessDesignPrimitiveClassNames.card.rowDefault,
  accentText: "text-[rgb(var(--accent))]",
  mutedText: "text-[rgb(var(--text-secondary)/0.96)]",
  metaText: "text-[rgb(var(--text-muted)/0.96)]",
  dividerBorder: "border-[rgb(var(--border-strong)/0.14)]",
  listDivider: "divide-y divide-[rgb(var(--border-strong)/0.12)]",
  stickyBar: fitnessDesignPrimitiveClassNames.card.stickyBar,
  badgeBase: fitnessDesignPrimitiveClassNames.tagBadge.badgeBase,
  todayBadge: fitnessDesignPrimitiveClassNames.tagBadge.todayBadge,
  defaultBadge: fitnessDesignPrimitiveClassNames.tagBadge.defaultBadge,
  successBadge: fitnessDesignPrimitiveClassNames.tagBadge.successBadge,
  warningBadge: fitnessDesignPrimitiveClassNames.tagBadge.warningBadge,
  destructiveBadge: fitnessDesignPrimitiveClassNames.tagBadge.destructiveBadge,
} as const;
