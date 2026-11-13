import type { ReactNode } from "react";
import { CardHeader, CardSurface, cardTokens, type CardHeadingLevel, type CardTone } from "@/components/ui/card-system";
import { cn } from "@/lib/cn";

/**
 * A Settings or Account panel: one `CardSurface`, a real heading (default `h3`: the section card in the floating
 * header is the `h2`), and a padded body. Replaces the old call-site-stripped panels (negative margins, transparent
 * border, transparent background) so every panel on these screens is a card on the shared surface.
 */
export function SettingsCard({
  title,
  meta,
  chips,
  tone = "neutral",
  headingLevel = 3,
  bodyClassName,
  children,
  ...props
}: {
  title: ReactNode;
  meta?: ReactNode;
  chips?: ReactNode;
  tone?: CardTone;
  headingLevel?: CardHeadingLevel;
  bodyClassName?: string;
  children?: ReactNode;
} & { [key: `data-${string}`]: string | undefined }) {
  return (
    <CardSurface tone={tone} showRail={tone !== "neutral"} {...props}>
      <CardHeader title={title} meta={meta} chips={chips} headingLevel={headingLevel} />
      {children ? <div className={cn(cardTokens.body, "space-y-3", bodyClassName)}>{children}</div> : null}
    </CardSurface>
  );
}
