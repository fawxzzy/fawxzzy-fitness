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
  scaffoldClassName: string;
  headerPanelClassName: string;
  sectionClassName: string;
  sectionShellClassName: string;
  sectionBodyClassName: string;
};

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
    scaffoldClassName: "space-y-3",
    headerPanelClassName: "p-4 pt-[1.2rem]",
    sectionClassName: "space-y-3",
    sectionShellClassName: "space-y-3 p-4",
    sectionBodyClassName: "space-y-3",
  },
  exerciseLog: {
    ...screenContracts.exerciseLog,
    scaffoldClassName: "space-y-3",
    headerPanelClassName: "p-4 pt-[1.2rem]",
    sectionClassName: "space-y-3",
    sectionShellClassName: "space-y-3 p-4",
    sectionBodyClassName: "space-y-3",
  },
  sessionAddExercise: {
    ...screenContracts.sessionAddExercise,
    scaffoldClassName: "space-y-3",
    headerPanelClassName: "p-4 pt-[1.2rem]",
    sectionClassName: "space-y-3",
    sectionShellClassName: "space-y-3 p-4",
    sectionBodyClassName: "space-y-3",
  },
  editDay: {
    ...screenContracts.editDay,
    scaffoldClassName: "space-y-3",
    headerPanelClassName: "p-4 pt-[1.2rem]",
    sectionClassName: "space-y-3",
    sectionShellClassName: "space-y-3 p-4",
    sectionBodyClassName: "space-y-3",
  },
  viewDay: {
    ...screenContracts.viewDay,
    scaffoldClassName: "space-y-3",
    headerPanelClassName: "p-4 pt-[1.2rem]",
    sectionClassName: "space-y-3",
    sectionShellClassName: "space-y-3 p-4",
    sectionBodyClassName: "space-y-3",
  },
  historyDetail: {
    ...screenContracts.historyDetail,
    scaffoldClassName: "space-y-3",
    headerPanelClassName: "p-4 pt-[1.2rem]",
    sectionClassName: "space-y-3",
    sectionShellClassName: "space-y-3 p-4",
    sectionBodyClassName: "space-y-3",
  },
  exerciseDetail: {
    ...screenContracts.exerciseDetail,
    scaffoldClassName: "space-y-3",
    headerPanelClassName: "p-4 pt-[1.2rem]",
    sectionClassName: "space-y-3",
    sectionShellClassName: "space-y-3 p-4",
    sectionBodyClassName: "space-y-3",
  },
  routinesOverview: {
    ...screenContracts.routinesOverview,
    scaffoldClassName: "space-y-4",
    headerPanelClassName: "space-y-4 p-4 pt-[1.2rem]",
    sectionClassName: "space-y-3 p-4",
    sectionShellClassName: "space-y-4 p-4",
    sectionBodyClassName: "space-y-3",
  },
  todayOverview: {
    ...screenContracts.todayOverview,
    scaffoldClassName: "space-y-4",
    headerPanelClassName: "space-y-4 p-4 pt-[1.2rem]",
    sectionClassName: "space-y-3 p-4",
    sectionShellClassName: "space-y-4 p-4",
    sectionBodyClassName: "space-y-3",
  },
};

export function resolveScreenRecipe(name: ScreenContractName): ScreenRecipe {
  return screenRecipes[name];
}
