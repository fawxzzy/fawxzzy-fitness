export type ExerciseDisclosureContract = {
  panelId: string;
  buttonTestId: string;
  panelTestId: string;
};

export function buildExerciseDisclosureContract(args: {
  itemId: string;
  scope: "session-exercise" | "day-detail";
}): ExerciseDisclosureContract {
  return {
    panelId: `${args.scope}-panel-${args.itemId}`,
    buttonTestId: `${args.scope}-toggle-${args.itemId}`,
    panelTestId: `${args.scope}-panel-${args.itemId}`,
  };
}
