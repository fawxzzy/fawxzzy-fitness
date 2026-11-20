import type { ReactNode } from "react";
import { screenHeaderTokens } from "@/components/ui/app/headerTokens";
import { ScreenHeaderMenuSlot } from "@/components/ui/app/ScreenHeaderMenu";

// The one screen header (DESIGN-CONTRACT.md section 15). Two kinds only:
// - "tab": Today, Routines, History, Settings. No Back button; the app menu sits top RIGHT on the title line.
// - "detail": every pushed screen. The Back button sits on the LEFT.
// Anatomy is fixed: [Back (detail only)] [title + inline status, at most one muted subtitle line]
// [at most one trailing action or chip] [app menu: only on the screen-level header that opts in with `appMenu`].
// No eyebrow, no centred title, no accent underline, no second action row: anything else belongs in the body.
export type ScreenHeaderKind = "tab" | "detail";

type ScreenHeaderProps = {
  kind: ScreenHeaderKind;
  /** A plain noun: "Today", "Routines", a routine or exercise name. Truncates to one line. */
  title: string;
  /** One short line in plain words (e.g. "Lower A · QA Routine"). Never a count or a second caption. */
  subtitle?: string | null;
  /** Inline status on the title line, e.g. `<OfflineSyncBadge variant="header" />` ("– Offline"), styled with `screenHeaderTokens.status`. */
  status?: ReactNode;
  /** Detail screens only: the 44x44 Back control. Ignored on tab screens. */
  back?: ReactNode;
  /** At most one 44x44 icon action or one chip. */
  trailing?: ReactNode;
  /**
   * Opt in to the app menu (DESIGN-CONTRACT.md 15.6): only the screen-level header of a tab screen or the live
   * workout sets this. The button itself comes from the screen shell (`headerMenu`), so a header outside such a
   * shell still renders no menu. Sheets and dialogs never set it: React context passes through portals, so an
   * automatic slot would put a second menu on every sheet header opened over a menu screen.
   */
  appMenu?: boolean;
  testId?: string;
};

export function ScreenHeader({ kind, title, subtitle, status, back, trailing, appMenu = false, testId }: ScreenHeaderProps) {
  const backNode = kind === "detail" ? back : null;
  const subtitleText = subtitle?.trim() ? subtitle.trim() : null;

  return (
    <header
      data-screen-header={kind}
      data-testid={testId}
      className={screenHeaderTokens.root}
    >
      <div className={screenHeaderTokens.row}>
        {backNode ? <div className={screenHeaderTokens.backSlot}>{backNode}</div> : null}
        <div className={screenHeaderTokens.titleBlock}>
          <div className={screenHeaderTokens.titleLine}>
            <h1 className={screenHeaderTokens.title} title={title}>{title}</h1>
            {status ?? null}
          </div>
          {subtitleText ? <p className={screenHeaderTokens.subtitle}>{subtitleText}</p> : null}
        </div>
        {trailing ? <div className={screenHeaderTokens.trailingSlot} data-screen-header-trailing="true">{trailing}</div> : null}
        {appMenu ? <ScreenHeaderMenuSlot /> : null}
      </div>
    </header>
  );
}
