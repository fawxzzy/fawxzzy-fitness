export type ScreenScaffoldType = "standard" | "session" | "editor" | "detail";
export type ScreenHeaderType = "shared";
export type SectionChromeType = "flat" | "card";
export type RowInteractionMode = "tap-log" | "tap-edit" | "tap-detail";
export type FooterDockType = "none" | "session" | "editor" | "detail";
export type FieldLabelStyle = "sharedStat";
export type SectionActionSlotType = "header-trailing" | "section-trailing";

export type ScreenContract = {
  scaffold: ScreenScaffoldType;
  header: ScreenHeaderType;
  sectionChrome: SectionChromeType;
  rowInteraction: RowInteractionMode;
  footerDock: FooterDockType;
  fieldLabelStyle: FieldLabelStyle;
  sectionActionSlot: SectionActionSlotType;
};

const sharedStatBaseContract = {
  header: "shared",
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
} satisfies Record<string, ScreenContract>;

export type ScreenContractName = keyof typeof screenContracts;

export function resolveScreenContract(name: ScreenContractName): ScreenContract {
  return screenContracts[name];
}
