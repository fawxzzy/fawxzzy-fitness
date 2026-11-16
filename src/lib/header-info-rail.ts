export type HeaderInfoRailTone = "default" | "muted" | "accent" | "success" | "warning";

export type HeaderInfoRailItem = {
  id: string;
  label: string;
  value?: string | number | null;
  tone?: HeaderInfoRailTone;
  title?: string;
  valuePosition?: "before" | "after";
};

function normalizeCount(value: number | null | undefined) {
  if (!Number.isFinite(value ?? null)) {
    return 0;
  }

  return Math.max(0, Math.floor(value as number));
}

export function buildRoutineTrainingRestInfoRailItems(args: {
  trainingDays: number | null | undefined;
  restDays: number | null | undefined;
}): HeaderInfoRailItem[] {
  return [
    {
      id: "training-days",
      label: "training",
      value: normalizeCount(args.trainingDays),
      tone: "accent",
      title: "Training days in this routine cycle",
    },
    {
      id: "rest-days",
      label: "rest",
      value: normalizeCount(args.restDays),
      tone: "muted",
      title: "Rest days in this routine cycle",
    },
  ];
}
