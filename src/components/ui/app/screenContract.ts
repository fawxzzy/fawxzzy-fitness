import { fitnessDesignPrimitiveClassNames, fitnessDesignTokens } from "@/components/ui/app/designSystem";

export type ScreenScaffoldType = "standard" | "session" | "editor" | "detail";
export type ScreenHeaderType = "shared";
export type ScreenHeaderRecipe = "sharedScreenHeader";
export type SectionShellRecipe = "sharedSectionShell";
export type SectionChromeType = "flat" | "card";
export type RowInteractionMode = "tap-log" | "tap-edit" | "tap-detail";
export type FooterDockType = "none" | "session" | "editor" | "detail";
export type FieldLabelStyle = "sharedStat";
export type SectionActionSlotType = "header-trailing" | "section-trailing";
export type MetadataSubtitleGrammar = "subtitle-then-meta";

export type ScreenContract = {
  scaffold: ScreenScaffoldType;
  header: ScreenHeaderType;
  headerRecipe: ScreenHeaderRecipe;
  sectionShellRecipe: SectionShellRecipe;
  sectionChrome: SectionChromeType;
  rowInteraction: RowInteractionMode;
  footerDock: FooterDockType;
  metadataSubtitleGrammar: MetadataSubtitleGrammar;
  fieldLabelStyle: FieldLabelStyle;
  sectionActionSlot: SectionActionSlotType;
};

export type ScreenRecipe = ScreenContract & {
  headerInsetMode: "topChrome" | "standalone";
  scaffoldClassName: string;
  headerPanelClassName: string;
  sectionClassName: string;
  sectionShellClassName: string;
  sectionBodyClassName: string;
};

const headerTokens = fitnessDesignPrimitiveClassNames.header;
const sectionTokens = fitnessDesignPrimitiveClassNames.sectionLayout;
const spacing = fitnessDesignTokens.spacing;

const topChromeHeaderPanelClassName = `${headerTokens.horizontalPadding} pb-[${spacing["2"]}] pt-[${spacing["1"]}]`;
const standaloneHeaderPanelClassName = `${headerTokens.horizontalPadding} pb-[${spacing["3"]}] pt-[${spacing["1.5"]}]`;
const topChromeHeaderPanelClassNameWithSpacing = `space-y-[${spacing["1.5"]}] ${topChromeHeaderPanelClassName}`;
const standaloneHeaderPanelClassNameWithSpacing = `space-y-[${spacing["2"]}] ${standaloneHeaderPanelClassName}`;

const sharedStatBaseContract = {
  header: "shared",
  headerRecipe: "sharedScreenHeader",
  sectionShellRecipe: "sharedSectionShell",
  metadataSubtitleGrammar: "subtitle-then-meta",
  fieldLabelStyle: "sharedStat",
} as const;

export const screenContracts = {
  currentSession: {
    scaffold: "session",
    sectionChrome: "card",
    rowInteraction: "tap-log",
    footerDock: "session",
    sectionActionSlot: "header-trailing",
    ...sharedStatBaseContract,
  },
  exerciseLog: {
    scaffold: "session",
    sectionChrome: "card",
    rowInteraction: "tap-log",
    footerDock: "session",
    sectionActionSlot: "header-trailing",
    ...sharedStatBaseContract,
  },
  sessionAddExercise: {
    scaffold: "editor",
    sectionChrome: "card",
    rowInteraction: "tap-edit",
    footerDock: "editor",
    sectionActionSlot: "header-trailing",
    ...sharedStatBaseContract,
  },
  editDay: {
    scaffold: "editor",
    sectionChrome: "card",
    rowInteraction: "tap-edit",
    footerDock: "editor",
    sectionActionSlot: "header-trailing",
    ...sharedStatBaseContract,
  },
  viewDay: {
    scaffold: "detail",
    sectionChrome: "card",
    rowInteraction: "tap-detail",
    footerDock: "detail",
    sectionActionSlot: "header-trailing",
    ...sharedStatBaseContract,
  },
  historyDetail: {
    scaffold: "detail",
    sectionChrome: "card",
    rowInteraction: "tap-detail",
    footerDock: "detail",
    sectionActionSlot: "header-trailing",
    ...sharedStatBaseContract,
  },
  exerciseDetail: {
    scaffold: "detail",
    sectionChrome: "card",
    rowInteraction: "tap-detail",
    footerDock: "none",
    sectionActionSlot: "header-trailing",
    ...sharedStatBaseContract,
  },
  routinesOverview: {
    scaffold: "standard",
    sectionChrome: "card",
    rowInteraction: "tap-detail",
    footerDock: "none",
    sectionActionSlot: "section-trailing",
    ...sharedStatBaseContract,
  },
  todayOverview: {
    scaffold: "standard",
    sectionChrome: "card",
    rowInteraction: "tap-detail",
    footerDock: "session",
    sectionActionSlot: "section-trailing",
    ...sharedStatBaseContract,
  },
} satisfies Record<string, ScreenContract>;

export type ScreenContractName = keyof typeof screenContracts;

export function resolveScreenContract(name: ScreenContractName): ScreenContract {
  return screenContracts[name];
}

export const screenRecipes: Record<ScreenContractName, ScreenRecipe> = {
  currentSession: {
    ...screenContracts.currentSession,
    headerInsetMode: "topChrome",
    scaffoldClassName: "space-y-3",
    headerPanelClassName: topChromeHeaderPanelClassNameWithSpacing,
    sectionClassName: sectionTokens.sectionBodyStandardClassName,
    sectionShellClassName: sectionTokens.sectionShellSpaciousClassName,
    sectionBodyClassName: sectionTokens.sectionBodyStandardClassName,
  },
  exerciseLog: {
    ...screenContracts.exerciseLog,
    headerInsetMode: "standalone",
    scaffoldClassName: "space-y-3",
    headerPanelClassName: standaloneHeaderPanelClassName,
    sectionClassName: sectionTokens.sectionBodyStandardClassName,
    sectionShellClassName: sectionTokens.sectionShellStandardClassName,
    sectionBodyClassName: sectionTokens.sectionBodyStandardClassName,
  },
  sessionAddExercise: {
    ...screenContracts.sessionAddExercise,
    headerInsetMode: "standalone",
    scaffoldClassName: "space-y-3",
    headerPanelClassName: standaloneHeaderPanelClassNameWithSpacing,
    sectionClassName: sectionTokens.sectionBodyStandardClassName,
    sectionShellClassName: sectionTokens.sectionShellStandardClassName,
    sectionBodyClassName: sectionTokens.sectionBodyStandardClassName,
  },
  editDay: {
    ...screenContracts.editDay,
    headerInsetMode: "standalone",
    scaffoldClassName: "space-y-3",
    headerPanelClassName: standaloneHeaderPanelClassNameWithSpacing,
    sectionClassName: sectionTokens.sectionBodyStandardClassName,
    sectionShellClassName: sectionTokens.sectionShellStandardClassName,
    sectionBodyClassName: sectionTokens.sectionBodyStandardClassName,
  },
  viewDay: {
    ...screenContracts.viewDay,
    headerInsetMode: "standalone",
    scaffoldClassName: "space-y-3",
    headerPanelClassName: standaloneHeaderPanelClassNameWithSpacing,
    sectionClassName: sectionTokens.sectionBodyStandardClassName,
    sectionShellClassName: sectionTokens.sectionShellStandardClassName,
    sectionBodyClassName: sectionTokens.sectionBodyStandardClassName,
  },
  historyDetail: {
    ...screenContracts.historyDetail,
    headerInsetMode: "standalone",
    scaffoldClassName: "space-y-3",
    headerPanelClassName: standaloneHeaderPanelClassName,
    sectionClassName: sectionTokens.sectionBodyStandardClassName,
    sectionShellClassName: sectionTokens.sectionShellStandardClassName,
    sectionBodyClassName: sectionTokens.sectionBodyStandardClassName,
  },
  exerciseDetail: {
    ...screenContracts.exerciseDetail,
    headerInsetMode: "standalone",
    scaffoldClassName: "space-y-3",
    headerPanelClassName: standaloneHeaderPanelClassName,
    sectionClassName: sectionTokens.sectionBodyStandardClassName,
    sectionShellClassName: sectionTokens.sectionShellStandardClassName,
    sectionBodyClassName: sectionTokens.sectionBodyStandardClassName,
  },
  routinesOverview: {
    ...screenContracts.routinesOverview,
    headerInsetMode: "topChrome",
    scaffoldClassName: "space-y-3",
    headerPanelClassName: topChromeHeaderPanelClassNameWithSpacing,
    sectionClassName: sectionTokens.sectionShellStandardClassName,
    sectionShellClassName: sectionTokens.sectionShellStandardClassName,
    sectionBodyClassName: sectionTokens.sectionBodyDenseClassName,
  },
  todayOverview: {
    ...screenContracts.todayOverview,
    headerInsetMode: "topChrome",
    scaffoldClassName: "space-y-3",
    headerPanelClassName: topChromeHeaderPanelClassNameWithSpacing,
    sectionClassName: sectionTokens.sectionShellStandardClassName,
    sectionShellClassName: sectionTokens.sectionShellStandardClassName,
    sectionBodyClassName: sectionTokens.sectionBodyDenseClassName,
  },
};

export function resolveScreenRecipe(name: ScreenContractName): ScreenRecipe {
  return screenRecipes[name];
}
