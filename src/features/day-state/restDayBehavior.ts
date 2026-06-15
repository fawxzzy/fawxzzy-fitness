export type RestDayTogglePolicy = "preserve_hidden";

export type RestDayBehaviorContract = {
  togglePolicy: RestDayTogglePolicy;
  requiresConfirmation: boolean;
  copy: {
    enabled: string;
    disabled: string;
    helper: string;
  };
};

export const REST_DAY_BEHAVIOR_CONTRACT: RestDayBehaviorContract = {
  togglePolicy: "preserve_hidden",
  requiresConfirmation: false,
  copy: {
    enabled: "Rest workout plan enabled. Existing exercises are preserved and hidden.",
    disabled: "Rest workout plan disabled. Preserved exercises are visible again.",
    helper: "Turning on rest hides planned exercises in this workout plan without deleting them.",
  },
};
