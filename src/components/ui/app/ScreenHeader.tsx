import type { ReactNode } from "react";
import { screenHeaderTokens } from "@/components/ui/app/headerTokens";
import { cn } from "@/lib/cn";

// The one screen header (DESIGN-CONTRACT.md section 15). Two kinds only:
// - "tab": Today, Routines, History, Settings. The tab bar stays on screen; no Back button.
// - "detail": every pushed screen. No tab bar; the Back button sits on the LEFT.
// Anatomy is fixed: [Back (detail only)] [title + at most one muted subtitle line] [at most one trailing action or chip].
// No eyebrow, no centred title, no accent underline, no second action row: anything else belongs in the body.
export type ScreenHeaderKind = "tab" | "detail";

type ScreenHeaderProps = {
  kind: ScreenHeaderKind;
  /** A plain noun: "Today", "Routines", a routine or exercise name. Truncates to one line. */
  title: string;
  /** One short line in plain words (e.g. "Lower A · QA Routine"). Never a count or a second caption. */
  subtitle?: string | null;
  /** Detail screens only: the 44x44 Back control. Ignored on tab screens. */
  back?: ReactNode;
  /** At most one 44x44 icon action or one chip. */
  trailing?: ReactNode;
  className?: string;
  testId?: string;
};

export function ScreenHeader({ kind, title, subtitle, back, trailing, className, testId }: ScreenHeaderProps) {
  const backNode = kind === "detail" ? back : null;
  const subtitleText = subtitle?.trim() ? subtitle.trim() : null;

  return (
    <header
      data-screen-header={kind}
      data-testid={testId}
      className={cn(screenHeaderTokens.root, className)}
    >
      <div className={screenHeaderTokens.row}>
        {backNode ? <div className={screenHeaderTokens.backSlot}>{backNode}</div> : null}
        <div className={screenHeaderTokens.titleBlock}>
          <h1 className={screenHeaderTokens.title} title={title}>{title}</h1>
          {subtitleText ? <p className={screenHeaderTokens.subtitle}>{subtitleText}</p> : null}
        </div>
        {trailing ? <div className={screenHeaderTokens.trailingSlot} data-screen-header-trailing="true">{trailing}</div> : null}
      </div>
    </header>
  );
}
