"use client";

import type { ReactNode } from "react";
import { CardHeader, CardSurface } from "@/components/ui/card-system";
import { GlowSwitch } from "@/components/ui/GlowSwitch";

/**
 * A Settings preference that is a single on/off choice: one card, the title and what it does on the left, the switch
 * on the right (44px tall, `aria-pressed`). `ariaLabel` names the setting for assistive tech ("Show QA data").
 * `saving` locks the switch while the choice is being stored, so a second tap cannot race the first.
 */
export function SettingsSwitchCard({
  title,
  meta,
  checked,
  ariaLabel,
  saving = false,
  disabled = false,
  onChange,
  ...props
}: {
  title: ReactNode;
  meta?: ReactNode;
  checked: boolean;
  ariaLabel: string;
  saving?: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
} & { [key: `data-${string}`]: string | undefined }) {
  return (
    <CardSurface tone={checked ? "current" : "neutral"} showRail={checked} {...props}>
      <CardHeader
        title={title}
        meta={meta}
        headingLevel={3}
        trailing={(
          <GlowSwitch
            checked={checked}
            ariaLabel={ariaLabel}
            disabled={saving || disabled}
            onClick={() => onChange(!checked)}
          />
        )}
      />
    </CardSurface>
  );
}
