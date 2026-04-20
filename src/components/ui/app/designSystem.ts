import tokensPack from "../../../../truth-pack/fitness/design-system/tokens.v1.json";
import primitivesPack from "../../../../truth-pack/fitness/design-system/primitives.v1.json";

export const fitnessDesignTokens = tokensPack.tokenGroups;
export const fitnessDesignPrimitiveContracts = primitivesPack.primitiveContracts;

export const fitnessDesignPrimitiveClassNames = {
  header: {
    horizontalPadding: "px-4 sm:px-5",
    primaryRowGap: "gap-2",
    actionRailGap: "gap-2",
    trailingSlot: "min-h-12 min-w-12",
    titleClassName: "text-[clamp(2rem,6vw,2.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]",
    titleToSecondaryGap: "mt-1",
    secondaryBlockGap: "space-y-0.5",
    contentBottomGap: "pb-2",
  },
  headerFamily: {
    panelClassName: "space-y-0 rounded-[1.8rem] border-white/14 shadow-[0_20px_42px_rgba(0,0,0,0.28)]",
    headerClassName: "",
    titleClassName: "text-[clamp(2rem,6vw,2.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]",
    actionClassName: "",
    actionButtonClassName: "h-10 w-10 rounded-full border border-white/18 bg-[rgb(var(--surface-rgb)/0.58)] px-0 shadow-[0_10px_22px_-12px_rgba(0,0,0,0.92)] hover:border-white/30 hover:bg-[rgb(var(--surface-rgb)/0.78)]",
    metaClassName: "px-5 pb-4",
    dividerClassName: "px-5 pb-4",
  },
  card: {
    panelBase: "relative isolate overflow-hidden rounded-[var(--radius-lg)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.88)] p-4 shadow-[var(--glass-shadow-base)] backdrop-blur-[10px]",
    panelMuted: "rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2)/0.72)] p-4",
    rowBase: "rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2)/0.84)] px-3.5 py-3",
    rowInteractive: "transition-[transform,filter] duration-75 ease-out active:scale-[0.992] active:brightness-[1.02]",
    rowAccent: "border-[rgb(var(--accent)/0.34)] bg-[rgb(var(--accent)/0.1)]",
    rowDefault: "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2)/0.84)] hover:border-[rgb(var(--border-strong)/0.28)] hover:bg-[rgb(var(--surface-3-rgb)/0.94)]",
    stickyBar: "rounded-[var(--radius-lg)] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.94)] px-2 py-2 shadow-[var(--glass-shadow-raised)] backdrop-blur-[10px]",
  },
  tagBadge: {
    badgeBase: "inline-flex items-center justify-center shrink-0 whitespace-nowrap leading-none rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
    todayBadge: "border-[rgb(var(--accent)/0.36)] bg-[rgb(var(--accent)/0.14)] text-[rgb(var(--text-primary))]",
    defaultBadge: "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-3-rgb)/0.92)] text-[rgb(var(--text-primary)/0.9)]",
    successBadge: "border-[rgb(var(--success-rgb)/0.34)] bg-[rgb(var(--success-rgb)/0.14)] text-[rgb(var(--text-primary))]",
    warningBadge: "border-[rgb(var(--warning-rgb)/0.34)] bg-[rgb(var(--warning-rgb)/0.14)] text-[rgb(255_242_220)]",
    destructiveBadge: "border-[rgb(var(--danger-rgb)/0.34)] bg-[rgb(var(--danger-rgb)/0.12)] text-[rgb(255_228_233)]",
  },
  sectionLayout: {
    sectionHeader: "flex items-start justify-between gap-3",
    sectionLabel: "text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]",
    sectionShellStandard: "space-y-3 p-4",
    sectionShellDense: "space-y-3",
    sectionShellSpacious: "space-y-4 p-4",
    sectionBodyStandard: "space-y-3",
    sectionBodyDense: "space-y-2.5",
  },
} as const;
